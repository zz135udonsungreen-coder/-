const subjectCount = 6;
const totalRounds = 8;
const meterMinimum = 1;
const meterMaximum = 7;
const storageKey = "ibdp-meter-game-data";
const letterGrades = ["A", "B", "C", "D", "E"];
const corePointMatrix = {
  A: { A: 3, B: 3, C: 2, D: 2, E: 0 },
  B: { A: 3, B: 2, C: 2, D: 1, E: 0 },
  C: { A: 2, B: 2, C: 1, D: 0, E: 0 },
  D: { A: 2, B: 1, C: 0, D: 0, E: 0 },
  E: { A: 0, B: 0, C: 0, D: 0, E: 0 },
};

const gameCard = document.querySelector("#game-card");
const meter = document.querySelector("#meter");
const meterFill = document.querySelector("#meter-fill");
const meterNeedle = document.querySelector("#meter-needle");
const meterValueDisplay = document.querySelector("#meter-value");
const meterUnitDisplay = document.querySelector("#meter-unit");
const meterScaleLabels = Array.from(document.querySelectorAll("#meter-scale span"));
const totalScoreDisplay = document.querySelector("#total-score");
const roundNumberDisplay = document.querySelector("#round-number");
const roundLabel = document.querySelector("#round-label");
const roundKindDisplay = document.querySelector("#round-kind");
const levelBadge = document.querySelector("#level-badge");
const gameMessage = document.querySelector("#game-message");
const actionButton = document.querySelector("#action-button");
const gameExitButton = document.querySelector("#game-exit-button");
const restartButton = document.querySelector("#restart-button");
const progressDots = Array.from(document.querySelectorAll(".progress-dot"));
const groupScoreDisplays = Array.from(
  { length: subjectCount },
  (_, index) => document.querySelector(`#group-score-${index + 1}`),
);
const tokScoreDisplay = document.querySelector("#tok-score");
const eeScoreDisplay = document.querySelector("#ee-score");
const finalResults = document.querySelector("#final-results");
const finalGrade = document.querySelector("#final-grade");
const finalSummary = document.querySelector("#final-summary");
const subjectTotalDisplay = document.querySelector("#subject-total");
const corePointsDisplay = document.querySelector("#core-points");
const overallScoreDisplay = document.querySelector("#overall-score");
const playerPanel = document.querySelector("#player-panel");
const playerMessage = document.querySelector("#player-message");
const playerForm = document.querySelector("#player-form");
const playerNameInput = document.querySelector("#player-name");
const cancelNameButton = document.querySelector("#cancel-name-button");
const playerProfile = document.querySelector("#player-profile");
const currentPlayerName = document.querySelector("#current-player-name");
const changeNameButton = document.querySelector("#change-name-button");
const recordMessage = document.querySelector("#record-message");
const leaderboardMessage = document.querySelector("#leaderboard-message");
const leaderboardList = document.querySelector("#leaderboard-list");

let state = "ready";
let round = 1;
let roundResults = Array(totalRounds).fill(null);
let meterValue = meterMinimum;
let activeMeterMinimum = meterMinimum;
let activeMeterMaximum = meterMaximum;
let direction = 1;
let previousFrame = 0;
let animationFrameId = null;
let playerName = "";
let gameRecords = [];
let editingName = false;
let storageError = "";

function isStoredRecord(record) {
  return record !== null
    && typeof record === "object"
    && typeof record.playerName === "string"
    && record.playerName.trim() !== ""
    && Array.isArray(record.subjectScores)
    && record.subjectScores.length === subjectCount
    && record.subjectScores.every((score) => Number.isInteger(score) && score >= meterMinimum && score <= meterMaximum)
    && letterGrades.includes(record.tokGrade)
    && letterGrades.includes(record.eeGrade)
    && Number.isInteger(record.total)
    && typeof record.passed === "boolean"
    && typeof record.completedAt === "string"
    && !Number.isNaN(Date.parse(record.completedAt));
}

function readSavedData() {
  let serialized;
  try {
    serialized = window.localStorage.getItem(storageKey);
  } catch {
    throw new Error("ブラウザーの保存データを読み込めません。ストレージ設定を確認してください。");
  }

  if (serialized === null) return { playerName: "", records: [] };

  let data;
  try {
    data = JSON.parse(serialized);
  } catch {
    throw new Error("保存データを読み込めません。データが壊れている可能性があります。");
  }

  if (
    data === null
    || typeof data !== "object"
    || typeof data.playerName !== "string"
    || (data.playerName !== "" && data.playerName.trim() === "")
    || !Array.isArray(data.records)
    || !data.records.every(isStoredRecord)
  ) {
    throw new Error("保存データの形式が正しくありません。");
  }

  return data;
}

function writeSavedData(nextPlayerName, records) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({
      playerName: nextPlayerName,
      records,
    }));
    return "";
  } catch {
    return "保存に失敗しました。ブラウザーの空き容量やストレージ設定を確認してください。";
  }
}

function renderPlayerProfile() {
  playerPanel.hidden = state === "playing" || state === "result";
  playerForm.hidden = Boolean(playerName) && !editingName;
  playerProfile.hidden = !playerName || editingName;
  cancelNameButton.hidden = !editingName || !playerName;
  currentPlayerName.textContent = playerName;
  if (storageError) {
    playerMessage.textContent = storageError;
    playerNameInput.disabled = true;
    playerForm.querySelector('button[type="submit"]').disabled = true;
  }
}

function renderLeaderboard() {
  leaderboardList.replaceChildren();
  leaderboardMessage.textContent = "";
  if (storageError) {
    leaderboardMessage.textContent = storageError;
    return;
  }
  if (gameRecords.length === 0) {
    leaderboardMessage.textContent = "まだプレイ記録はありません。ゲーム終了後にここへ保存されます。";
    return;
  }

  const sortedRecords = [...gameRecords].sort((first, second) => (
    second.total - first.total
    || Date.parse(first.completedAt) - Date.parse(second.completedAt)
  ));
  const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  sortedRecords.forEach((record, index) => {
    const item = document.createElement("li");
    const rank = document.createElement("strong");
    const details = document.createElement("div");
    const nameAndScore = document.createElement("p");
    const scores = document.createElement("small");

    rank.className = "leaderboard-rank";
    rank.textContent = `${index + 1}位`;
    nameAndScore.className = "leaderboard-name-score";
    nameAndScore.textContent = `${record.playerName} — ${record.total}点${record.passed ? "（合格）" : ""}`;
    scores.textContent = `Group ${record.subjectScores.join(" / ")}｜TOK ${record.tokGrade}・EE ${record.eeGrade}｜${dateFormatter.format(new Date(record.completedAt))}`;
    details.append(nameAndScore, scores);
    item.append(rank, details);
    leaderboardList.append(item);
  });
}

function isCoreRound() {
  return round > subjectCount;
}

function getRoundName() {
  if (round <= subjectCount) return `Group${round}`;
  return round === subjectCount + 1 ? "TOK" : "EE";
}

function getMeterSpeed() {
  if (round <= 3) return 42;
  if (round <= subjectCount) return 30;
  return (36 * 5) / meterMaximum;
}

function getLetterGrade() {
  return letterGrades[Math.min(letterGrades.length - 1, Math.floor(meterValue))];
}

function getTotals() {
  const subjectScores = roundResults.slice(0, subjectCount);
  const subjectTotal = subjectScores.reduce((sum, score) => sum + (score ?? 0), 0);
  const tokGrade = roundResults[subjectCount];
  const eeGrade = roundResults[subjectCount + 1];
  const corePoints = tokGrade !== null && eeGrade !== null
    ? corePointMatrix[tokGrade][eeGrade]
    : 0;

  return {
    subjectScores,
    subjectTotal,
    corePoints,
    total: subjectTotal + corePoints,
  };
}

function renderMeter() {
  const isLetterMeter = isCoreRound();
  const meterPercentage = ((meterValue - activeMeterMinimum) / (activeMeterMaximum - activeMeterMinimum)) * 100;
  const displayedValue = isLetterMeter ? getLetterGrade() : String(Math.round(meterValue));
  const accessibleValue = isLetterMeter
    ? String(letterGrades.indexOf(displayedValue) + 1)
    : displayedValue;

  meterFill.style.width = `${meterPercentage}%`;
  meterNeedle.style.left = `${meterPercentage}%`;
  meterValueDisplay.textContent = displayedValue;
  meter.setAttribute("aria-valuenow", accessibleValue);
  meter.setAttribute("aria-valuetext", isLetterMeter ? displayedValue : `${displayedValue}ポイント`);
}

function renderRoundInfo() {
  const isHigherLevel = round <= 3;
  const isStandardLevel = round > 3 && round <= subjectCount;
  const isCore = isCoreRound();

  roundLabel.textContent = getRoundName();
  roundNumberDisplay.textContent = String(round);
  roundKindDisplay.textContent = isHigherLevel
    ? "HIGHER LEVEL"
    : isStandardLevel
      ? "STANDARD LEVEL"
      : "CORE ASSESSMENT";
  levelBadge.textContent = isCore ? "CORE" : isHigherLevel ? "HL" : "SL";
  levelBadge.classList.toggle("level-hl", isHigherLevel);
  levelBadge.classList.toggle("level-sl", isStandardLevel);
  levelBadge.classList.toggle("level-core", isCore);
  gameCard.classList.toggle("mode-hl", isHigherLevel);
  gameCard.classList.toggle("mode-sl", isStandardLevel);
  gameCard.classList.toggle("mode-core", isCore);

  activeMeterMaximum = isCore ? letterGrades.length : meterMaximum;
  activeMeterMinimum = isCore ? 0 : meterMinimum;
  meterUnitDisplay.textContent = isCore ? "grade" : "pt";
  meter.setAttribute("aria-label", isCore ? `${getRoundName()}の評価` : `${getRoundName()}のポイント`);
  meter.setAttribute("aria-valuemin", isCore ? "1" : String(meterMinimum));
  meter.setAttribute("aria-valuemax", isCore ? String(letterGrades.length) : String(meterMaximum));
  meterScaleLabels.forEach((label, index) => {
    label.textContent = isCore
      ? letterGrades[index]
      : ["1", "2.5", "4", "5.5", "7"][index];
  });
}

function renderScores() {
  groupScoreDisplays.forEach((display, index) => {
    display.textContent = roundResults[index] === null ? "—" : String(roundResults[index]);
  });
  tokScoreDisplay.textContent = roundResults[subjectCount] ?? "—";
  eeScoreDisplay.textContent = roundResults[subjectCount + 1] ?? "—";
  totalScoreDisplay.textContent = String(getTotals().total);
}

function renderProgress() {
  renderRoundInfo();
  renderScores();
  progressDots.forEach((dot, index) => {
    dot.classList.toggle("is-done", roundResults[index] !== null);
    dot.classList.toggle("is-active", state === "playing" && index === round - 1);
  });
}

function animateMeter(timestamp) {
  animationFrameId = null;
  if (state !== "playing") return;

  const delta = previousFrame === 0 ? 0 : Math.min((timestamp - previousFrame) / 1000, 0.05);
  previousFrame = timestamp;
  meterValue += direction * getMeterSpeed() * delta;

  if (meterValue >= activeMeterMaximum) {
    meterValue = activeMeterMaximum;
    direction = -1;
  } else if (meterValue <= activeMeterMinimum) {
    meterValue = activeMeterMinimum;
    direction = 1;
  }

  renderMeter();
  animationFrameId = requestAnimationFrame(animateMeter);
}

function beginRound() {
  direction = 1;
  previousFrame = 0;
  state = "playing";
  gameExitButton.hidden = false;
  renderProgress();
  meterValue = activeMeterMinimum;
  renderPlayerProfile();
  actionButton.textContent = "ストップ！";
  gameMessage.textContent = `${getRoundName()}のメーターを止めよう！`;
  renderMeter();
  animationFrameId = requestAnimationFrame(animateMeter);
}

function startGame() {
  if (!playerName || storageError) return;
  round = 1;
  roundResults = Array(totalRounds).fill(null);
  gameCard.hidden = false;
  finalResults.hidden = true;
  finalGrade.classList.remove("grade--pass", "grade--fail");
  beginRound();
}

function setCriterion(name, description, passed) {
  const row = document.querySelector(`#criterion-${name}`);
  const text = document.querySelector(`#criterion-${name}-text`);
  const status = document.querySelector(`#criterion-${name}-status`);
  row.classList.toggle("is-pass", passed);
  row.classList.toggle("is-fail", !passed);
  text.textContent = description;
  status.textContent = passed ? "PASS" : "FAIL";
}

function renderFinalResults() {
  const { subjectScores, subjectTotal, corePoints, total } = getTotals();
  const tokGrade = roundResults[subjectCount];
  const eeGrade = roundResults[subjectCount + 1];
  const hlTotal = subjectScores.slice(0, 3).reduce((sum, score) => sum + score, 0);
  const slTotal = subjectScores.slice(3).reduce((sum, score) => sum + score, 0);
  const twoPointCount = subjectScores.filter((score) => score === 2).length;
  const lowScoreCount = subjectScores.filter((score) => score <= 3).length;
  const hasNoCoreE = tokGrade !== "E" && eeGrade !== "E";
  const checks = [
    total >= 24,
    hasNoCoreE,
    subjectScores.every((score) => score >= 2),
    twoPointCount <= 2,
    lowScoreCount <= 3,
    hlTotal >= 12,
    slTotal >= 9,
  ];
  const passed = checks.every(Boolean);

  finalGrade.textContent = passed ? "Pass" : "Fail";
  finalGrade.classList.toggle("grade--pass", passed);
  finalGrade.classList.toggle("grade--fail", !passed);
  finalSummary.textContent = `総合 ${total}点（科目 ${subjectTotal}点 + TOK・EE ${corePoints}点）`;
  subjectTotalDisplay.textContent = String(subjectTotal);
  corePointsDisplay.textContent = String(corePoints);
  overallScoreDisplay.textContent = String(total);

  setCriterion("total", `総合スコア ${total}点（24点以上）`, checks[0]);
  setCriterion("no-e", `TOK ${tokGrade}・EE ${eeGrade}（E評価なし）`, checks[1]);
  setCriterion("minimum", `全科目2点以上（${subjectScores.join(" / ")}）`, checks[2]);
  setCriterion("twos", `2点の科目 ${twoPointCount}（最大2科目）`, checks[3]);
  setCriterion("low-scores", `3点以下の科目 ${lowScoreCount}（最大3科目）`, checks[4]);
  setCriterion("hl", `HL合計 ${hlTotal}点（12点以上）`, checks[5]);
  setCriterion("sl", `SL合計 ${slTotal}点（9点以上）`, checks[6]);
  finalResults.hidden = false;
  return { subjectScores, tokGrade, eeGrade, total, passed };
}

function saveFinalRecord({ subjectScores, tokGrade, eeGrade, total, passed }) {
  const record = {
    playerName,
    subjectScores: [...subjectScores],
    tokGrade,
    eeGrade,
    total,
    passed,
    completedAt: new Date().toISOString(),
  };
  const nextRecords = [...gameRecords, record];
  const error = writeSavedData(playerName, nextRecords);
  if (error) {
    recordMessage.textContent = error;
    return;
  }

  gameRecords = nextRecords;
  recordMessage.textContent = `${playerName} さんの記録を保存しました。`;
  renderLeaderboard();
}

function stopRound() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  roundResults[round - 1] = isCoreRound() ? getLetterGrade() : Math.round(meterValue);
  state = round === totalRounds ? "complete" : "result";

  if (state === "complete") {
    actionButton.textContent = "もう一度挑戦";
    gameMessage.textContent = "全8つのメーター終了。結果発表を確認しよう。";
  } else {
    actionButton.textContent = "次のメーター";
    gameMessage.textContent = `${getRoundName()}を記録しました。次のメーターへ進もう。`;
  }

  renderProgress();
  if (state === "complete") {
    gameExitButton.hidden = true;
    gameCard.hidden = true;
    renderPlayerProfile();
    recordMessage.textContent = "";
    saveFinalRecord(renderFinalResults());
  }
}

function exitGame() {
  if (!window.confirm("ゲームを終了しますか？現在のプレイ内容は保存されません。")) return;

  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  state = "ready";
  round = 1;
  roundResults = Array(totalRounds).fill(null);
  gameExitButton.hidden = true;
  gameCard.hidden = false;
  actionButton.textContent = "スタート";
  gameMessage.textContent = "ゲームを終了しました。もう一度挑戦するにはスタートを押してください。";
  renderProgress();
  renderMeter();
  renderPlayerProfile();
}

playerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const nextPlayerName = playerNameInput.value.trim();
  if (!nextPlayerName) {
    playerMessage.textContent = "ユーザー名を入力してください。";
    playerNameInput.focus();
    return;
  }

  const error = writeSavedData(nextPlayerName, gameRecords);
  if (error) {
    playerMessage.textContent = error;
    return;
  }

  playerName = nextPlayerName;
  editingName = false;
  playerMessage.textContent = "ユーザー名を保存しました。";
  gameCard.hidden = false;
  renderPlayerProfile();
});

changeNameButton.addEventListener("click", () => {
  editingName = true;
  playerNameInput.value = playerName;
  playerMessage.textContent = "";
  gameCard.hidden = true;
  renderPlayerProfile();
  playerNameInput.focus();
});

cancelNameButton.addEventListener("click", () => {
  editingName = false;
  playerMessage.textContent = "";
  gameCard.hidden = false;
  renderPlayerProfile();
});

actionButton.addEventListener("click", () => {
  if (state === "ready") {
    startGame();
  } else if (state === "playing") {
    stopRound();
  } else if (state === "result") {
    round += 1;
    beginRound();
  }
});

gameExitButton.addEventListener("click", exitGame);
restartButton.addEventListener("click", startGame);

try {
  const savedData = readSavedData();
  playerName = savedData.playerName;
  gameRecords = savedData.records;
} catch (error) {
  storageError = error.message;
}

gameCard.hidden = !playerName || Boolean(storageError);
renderPlayerProfile();
renderLeaderboard();
renderRoundInfo();
renderMeter();
renderScores();
