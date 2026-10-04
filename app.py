import os
from datetime import date, datetime, timedelta

try:
    from flask import Flask, jsonify, render_template, request  # type: ignore[import-not-found]
except ImportError as exc:
    raise RuntimeError(
        "Flask is required to run this app. Install dependencies with 'pip install flask'."
    ) from exc

app = Flask(__name__)

# Simple in-memory state keeps the first version database-free.
daily_goal = 2000
daily_totals = {}
intake_history = []


def get_streak():
    today = date.today()
    first_day = today if daily_totals.get(today.isoformat(), 0) else today - timedelta(days=1)
    streak = 0

    while daily_totals.get(first_day.isoformat(), 0) > 0:
        streak += 1
        first_day -= timedelta(days=1)

    return streak


def get_weekly_stats():
    today = date.today()
    week = []

    for days_ago in range(6, -1, -1):
        day = today - timedelta(days=days_ago)
        total = daily_totals.get(day.isoformat(), 0)
        week.append({
            "date": day.isoformat(),
            "label": day.strftime("%a"),
            "total": total,
        })

    return week


def get_achievements(weekly_total, streak):
    return [
        {
            "title": "First Sip",
            "description": "Log your first glass of water.",
            "earned": any(total > 0 for total in daily_totals.values()),
        },
        {
            "title": "Goal Getter",
            "description": "Reach your daily goal in a day.",
            "earned": any(total >= daily_goal for total in daily_totals.values()),
        },
        {
            "title": "Three-Day Flow",
            "description": "Keep your hydration streak for 3 days.",
            "earned": streak >= 3,
        },
        {
            "title": "10 Litre Week",
            "description": "Drink 10,000 ml over 7 days.",
            "earned": weekly_total >= 10000,
        },
    ]


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/state")
def get_state():
    today = date.today().isoformat()
    consumed = daily_totals.get(today, 0)
    remaining = max(daily_goal - consumed, 0)
    progress = min((consumed / daily_goal) * 100, 100)
    weekly = get_weekly_stats()
    weekly_total = sum(day["total"] for day in weekly)
    streak = get_streak()
    week_start = date.today() - timedelta(days=6)
    history = []
    for entry in reversed(intake_history):
        logged_date = date.fromisoformat(entry["date"])
        if logged_date < week_start:
            continue
        if entry["date"] == today:
            day_label = "Today"
        elif logged_date == date.today() - timedelta(days=1):
            day_label = "Yesterday"
        else:
            day_label = logged_date.strftime("%a")
        history.append({**entry, "day_label": day_label})
        if len(history) == 12:
            break

    if progress >= 100:
        message = "Daily goal completed! Great job!"
    elif progress >= 75:
        message = "Almost there!"
    elif progress >= 50:
        message = "You're halfway there!"
    elif progress >= 25:
        message = "Good start! Keep going!"
    else:
        message = "Let's get started!"

    return jsonify(
        goal=daily_goal,
        consumed=consumed,
        remaining=remaining,
        progress=round(progress),
        message=message,
        history=history,
        weekly=weekly,
        weekly_total=weekly_total,
        weekly_average=round(weekly_total / 7),
        streak=streak,
        achievements=get_achievements(weekly_total, streak),
    )


@app.post("/api/water")
def add_water():
    data = request.get_json(silent=True) or {}
    amount = data.get("amount")

    if isinstance(amount, bool) or not isinstance(amount, int) or amount <= 0:
        return jsonify(error="Amount must be a positive whole number of milliliters."), 400

    today = date.today().isoformat()
    daily_totals[today] = daily_totals.get(today, 0) + amount
    intake_history.append({
        "amount": amount,
        "date": today,
        "time": datetime.now().astimezone().strftime("%I:%M %p").lstrip("0"),
    })
    return get_state()


@app.post("/api/reset")
def reset_water():
    today = date.today().isoformat()
    daily_totals[today] = 0
    intake_history[:] = [entry for entry in intake_history if entry["date"] != today]
    return get_state()


@app.put("/api/goal")
def update_goal():
    global daily_goal
    data = request.get_json(silent=True) or {}
    goal = data.get("goal")

    if isinstance(goal, bool) or not isinstance(goal, int) or goal <= 0:
        return jsonify(error="Daily goal must be a positive whole number of milliliters."), 400

    daily_goal = goal
    return get_state()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)