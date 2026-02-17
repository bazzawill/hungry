from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///calendar.db"
db = SQLAlchemy(app)


# Database Model
class Assignment(db.Model):
    date_str = db.Column(db.String(10), primary_key=True)  # format: YYYY-MM-DD
    name = db.Column(db.String(10))


with app.app_context():
    db.create_all()


def get_default_name(target_date):
    # Reference date (a Monday) to start the Tom, Tom, Charlie, Charlie pattern
    reference_date = datetime(2024, 1, 1)
    days_diff = (target_date - reference_date).days
    pattern = ["Tom", "Tom", "Charlie", "Charlie"]
    return pattern[days_diff % 4]


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/data")
def get_data():
    # Calculate date range: 1 week past, current week, 2 weeks future
    today = datetime.now()
    # start_of_week = today - timedelta(days=today.weekday())
    days_since_sunday = (today.weekday() + 1) % 7

    # Start of "this" week (the most recent Sunday)
    start_of_this_week = today - timedelta(days=days_since_sunday)
    # Start of the display range (1 week before this week)
    start_date = start_of_this_week - timedelta(weeks=1)
    # start_date = start_of_week - timedelta(weeks=1)

    days = []
    counts = {"Tom": 0, "Charlie": 0}

    for i in range(28):  # 4 weeks total
        current_date = start_date + timedelta(days=i)
        ds = current_date.strftime("%Y-%m-%d")

        # Check DB for override, else use pattern
        record = Assignment.query.filter_by(date_str=ds).first()
        name = record.name if record else get_default_name(current_date)

        days.append(
            {"date": ds, "name": name, "display": current_date.strftime("%a %d %b")}
        )
        counts[name] += 1

    return jsonify({"days": days, "counts": counts})


@app.route("/api/save", methods=["POST"])
def save():
    data = request.json
    record = Assignment.query.filter_by(date_str=data["date"]).first()
    if record:
        record.name = data["name"]
    else:
        new_rec = Assignment(date_str=data["date"], name=data["name"])
        db.session.add(new_rec)
    db.session.commit()
    return jsonify({"status": "success"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=9000, debug=False)
