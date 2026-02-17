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
    # Get offset from URL (default to 0)
    offset = int(request.args.get("offset", 0))

    today = datetime.now()
    days_since_sunday = (today.weekday() + 1) % 7

    # Calculate the base start (Sunday of "this" week)
    # Then apply the user's offset (in weeks)
    start_of_this_week = today - timedelta(days=days_since_sunday)
    base_start = start_of_this_week + timedelta(weeks=offset)

    # Range: 1 week before the base_start, plus 3 following weeks
    start_date = base_start - timedelta(weeks=1)

    days = []
    counts = {"Tom": 0, "Charlie": 0}

    for i in range(28):
        current_date = start_date + timedelta(days=i)
        ds = current_date.strftime("%Y-%m-%d")

        record = Assignment.query.filter_by(date_str=ds).first()
        name = record.name if record else get_default_name(current_date)

        # Change this line inside the for loop in get_data():
        days.append(
            {
                "date": ds,
                "name": name,
                "display": current_date.strftime("%d %b"),  # Result: "17 Feb"
            }
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
