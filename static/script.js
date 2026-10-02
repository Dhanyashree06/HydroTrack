const consumedValue = document.querySelector("#consumed-value");
const remainingValue = document.querySelector("#remaining-value");
const goalValue = document.querySelector("#goal-value");
const progressValue = document.querySelector("#progress-value");
const progressFill = document.querySelector("#progress-fill");
const progressTrack = document.querySelector(".progress-track");
const progressMessage = document.querySelector("#progress-message");
const statusMessage = document.querySelector("#status-message");
const weeklyChart = document.querySelector("#weekly-chart");
const historyList = document.querySelector("#history-list");
const historyEmpty = document.querySelector("#history-empty");
const achievementsList = document.querySelector("#achievements-list");
const reminderToggle = document.querySelector("#reminder-toggle");
const reminderInterval = document.querySelector("#reminder-interval");
const reminderMessage = document.querySelector("#reminder-message");
const reminderEnabledKey = "hydrotrack-reminder-enabled";
const reminderIntervalKey = "hydrotrack-reminder-interval";
const reminderLastKey = "hydrotrack-reminder-last";
let reminderTimer = null;

function renderState(state) {
    consumedValue.textContent = state.consumed.toLocaleString();
    remainingValue.textContent = state.remaining.toLocaleString();
    goalValue.textContent = state.goal.toLocaleString();
    progressValue.textContent = `${state.progress}%`;
    progressFill.style.width = `${state.progress}%`;
    progressTrack.setAttribute("aria-valuenow", state.progress);
    progressMessage.textContent = state.message;
    statusMessage.textContent = "";

    document.querySelector("#weekly-total").textContent = state.weekly_total.toLocaleString();
    document.querySelector("#weekly-average").textContent = state.weekly_average.toLocaleString();
    document.querySelector("#streak-count").textContent = state.streak.toLocaleString();
    renderWeeklyChart(state.weekly, state.goal);
    renderHistory(state.history);
    renderAchievements(state.achievements);
    document.querySelectorAll(".streak-rule span").forEach((day, index) => {
        day.classList.toggle("is-active", index < Math.min(state.streak, 7));
    });
}

function renderWeeklyChart(week, goal) {
    const days = week.map((day, index) => {
        const item = document.createElement("div");
        const today = index === week.length - 1;
        const amount = document.createElement("span");
        const bar = document.createElement("div");
        const fill = document.createElement("div");
        const label = document.createElement("span");

        item.className = `week-day${today ? " is-today" : ""}`;
        item.title = `${day.label}: ${day.total.toLocaleString()} ml`;
        amount.className = "week-amount";
        amount.textContent = day.total ? day.total.toLocaleString() : "";
        bar.className = "week-bar";
        fill.className = "week-bar-fill";
        fill.style.height = day.total ? `${Math.max(4, Math.min(day.total / goal * 100, 100))}%` : "0";
        bar.append(fill);
        label.className = "week-label";
        label.textContent = day.label;
        item.append(amount, bar, label);
        return item;
    });

    weeklyChart.replaceChildren(...days);
}

function renderHistory(history) {
    const entries = history.map((entry) => {
        const item = document.createElement("li");
        const when = document.createElement("span");
        const day = document.createElement("span");
        const time = document.createElement("span");
        const drink = document.createElement("span");
        const dot = document.createElement("span");
        const amount = document.createElement("span");

        item.className = "history-entry";
        when.className = "history-when";
        day.className = "history-day";
        day.textContent = entry.day_label;
        time.className = "history-time";
        time.textContent = entry.time;
        when.append(day, time);
        drink.className = "history-drink";
        dot.className = "history-dot";
        dot.setAttribute("aria-hidden", "true");
        drink.append(dot, document.createTextNode("Water"));
        amount.className = "history-amount";
        amount.textContent = `${entry.amount.toLocaleString()} ml`;
        item.append(when, drink, amount);
        return item;
    });

    historyList.replaceChildren(...entries);
    historyEmpty.hidden = entries.length > 0;
}

function renderAchievements(achievements) {
    const items = achievements.map((achievement) => {
        const item = document.createElement("div");
        const mark = document.createElement("span");
        const copy = document.createElement("div");
        const title = document.createElement("p");
        const description = document.createElement("p");
        const status = document.createElement("span");

        item.className = `achievement-item${achievement.earned ? " is-earned" : ""}`;
        mark.className = "achievement-mark";
        mark.textContent = achievement.earned ? "✓" : "•";
        mark.setAttribute("aria-hidden", "true");
        title.className = "achievement-title";
        title.textContent = achievement.title;
        description.className = "achievement-description";
        description.textContent = achievement.description;
        copy.append(title, description);
        status.className = "achievement-status";
        status.textContent = achievement.earned ? "EARNED" : "IN PROGRESS";
        item.append(mark, copy, status);
        return item;
    });

    achievementsList.replaceChildren(...items);
}

async function updateState(path, options = {}) {
    const response = await fetch(path, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
    }

    renderState(data);
    if (path === "/api/water" && reminderToggle.getAttribute("aria-pressed") === "true") {
        localStorage.setItem(reminderLastKey, String(Date.now()));
    }
}

async function runAction(action) {
    try {
        await action();
    } catch (error) {
        statusMessage.textContent = error.message;
    }
}

function showReminder() {
    reminderMessage.textContent = "Time for a glass of water. A few sips count.";

    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("HydroTrack reminder", {
            body: "Time for a glass of water. A few sips count.",
        });
    }
}

function scheduleReminder() {
    window.clearInterval(reminderTimer);
    reminderTimer = null;

    if (reminderToggle.getAttribute("aria-pressed") !== "true") {
        reminderMessage.textContent = "Reminders are off.";
        return;
    }

    const intervalMinutes = Number(reminderInterval.value);
    const intervalMs = intervalMinutes * 60 * 1000;
    reminderMessage.textContent = `Reminders are on every ${intervalMinutes} minutes while this page is open.`;

    if (!localStorage.getItem(reminderLastKey)) {
        localStorage.setItem(reminderLastKey, String(Date.now()));
    }

    reminderTimer = window.setInterval(() => {
        const lastReminder = Number(localStorage.getItem(reminderLastKey)) || Date.now();
        if (Date.now() - lastReminder >= intervalMs) {
            localStorage.setItem(reminderLastKey, String(Date.now()));
            showReminder();
        }
    }, 30000);
}

async function toggleReminders() {
    const enabled = reminderToggle.getAttribute("aria-pressed") === "true";

    if (!enabled && "Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
    }

    const nextEnabled = !enabled;
    reminderToggle.setAttribute("aria-pressed", String(nextEnabled));
    reminderToggle.textContent = nextEnabled ? "Turn off" : "Turn on";
    reminderInterval.disabled = false;
    localStorage.setItem(reminderEnabledKey, String(nextEnabled));
    localStorage.setItem(reminderIntervalKey, reminderInterval.value);
    scheduleReminder();
}

// Wire the preset amounts, custom goal form, and daily reset to the Flask API.
document.querySelectorAll(".water-button").forEach((button) => {
    button.addEventListener("click", () => runAction(() => updateState("/api/water", {
        method: "POST",
        body: JSON.stringify({ amount: Number(button.dataset.amount) }),
    })));
});

document.querySelector("#goal-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.querySelector("#goal-input");
    const goal = Number(input.value);

    if (!Number.isInteger(goal) || goal <= 0) {
        statusMessage.textContent = "Enter a daily goal greater than 0 ml.";
        input.focus();
        return;
    }

    runAction(async () => {
        await updateState("/api/goal", {
            method: "PUT",
            body: JSON.stringify({ goal }),
        });
        input.value = "";
    });
});

document.querySelector("#reset-button").addEventListener("click", () => runAction(() => updateState("/api/reset", {
    method: "POST",
})));

reminderInterval.value = localStorage.getItem(reminderIntervalKey) || reminderInterval.value;
reminderToggle.setAttribute("aria-pressed", localStorage.getItem(reminderEnabledKey) === "true" ? "true" : "false");
reminderToggle.textContent = reminderToggle.getAttribute("aria-pressed") === "true" ? "Turn off" : "Turn on";
reminderToggle.addEventListener("click", () => runAction(toggleReminders));
reminderInterval.addEventListener("change", () => {
    localStorage.setItem(reminderIntervalKey, reminderInterval.value);
    if (reminderToggle.getAttribute("aria-pressed") === "true") {
        localStorage.setItem(reminderLastKey, String(Date.now()));
        scheduleReminder();
    }
});
if (reminderToggle.getAttribute("aria-pressed") === "true") {
    scheduleReminder();
}

runAction(() => updateState("/api/state"));