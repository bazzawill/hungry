import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Card, Form } from 'react-bootstrap'; // Assuming react-bootstrap is available

const API_URL = 'http://localhost:3001/api/calendar-data';

function CalendarView() {
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Calculate date range: last week, this week, next 2 weeks
  const getDates = () => {
    const today = new Date();
    const dates = [];

    // Last week (start from Monday of last week to Sunday of last week)
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(today.getDate() - today.getDay() - 7); // Sunday is 0, so today.getDay() - 7 gives Sunday of *last* week. To get Monday, adjust.
    // Let's simplify: get last 7 days from today for 'last week'
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - today.getDay() - 7 + i); // This will give dates from last Sunday to last Saturday. Let's refine.

        // More robust date calculation for a full week view:
        // For simplicity, let's define "last week" as the 7 days *before* the current week started.
        // And "this week" as Mon-Sun of the current week.
        // "next 2 weeks" as the following 14 days.
    }

    // Let's use a simpler, absolute date range calculation for clarity:
    // Today
    const todayForRange = new Date();
    const startDate = new Date(todayForRange);
    startDate.setDate(todayForRange.getDate() - 7); // Start of last week (e.g., last Sunday)

    const endDate = new Date(todayForRange);
    endDate.setDate(todayForRange.getDate() + 14); // End of two weeks from now (e.g., two Saturdays from now)

    return { startDate, endDate };
  };

  // Helper function to format date as YYYY-MM-DD for API
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const { startDate, endDate } = getDates();
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);

    const fetchCalendarData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}?startDate=${formattedStartDate}&endDate=${formattedEndDate}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: \${response.status}`);
        }
        const data = await response.json();
        // The backend already ensures all dates in the range are present,
        // so we just need to set the data.
        setCalendarData(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  }, []); // Empty dependency array means this runs once on mount

  const handleSelection = async (date, person, type) => {
    // type will be 'increment' or 'decrement'
    const existingEntry = calendarData.find(entry => entry.date === date);
    if (!existingEntry) return; // Should not happen if backend returns all dates

    let newTomCount = existingEntry.tom_count;
    let newCharlieCount = existingEntry.charlie_count;

    if (person === 'Tom') {
      if (type === 'increment') newTomCount++;
      else if (type === 'decrement' && newTomCount > 0) newTomCount--;
      else return; // Cannot decrement below zero
    } else if (person === 'Charlie') {
      if (type === 'increment') newCharlieCount++;
      else if (type === 'decrement' && newCharlieCount > 0) newCharlieCount--;
      else return; // Cannot decrement below zero
    } else {
      return; // Invalid person
    }

    const updatedEntry = {
      ...existingEntry,
      tom_count: newTomCount,
      charlie_count: newCharlieCount
    };

    // Optimistically update UI
    const updatedCalendarData = calendarData.map(entry =>
      entry.date === date ? updatedEntry : entry
    );
    setCalendarData(updatedCalendarData);

    // Send update to backend
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: date,
          tom_count: newTomCount,
          charlie_count: newCharlieCount
        }),
      });

      if (!response.ok) {
        // If backend fails, revert UI optimistic update
        const originalEntry = calendarData.find(entry => entry.date === date); // Re-fetch original state if needed, or use saved original
        const revertedCalendarData = calendarData.map(entry =>
          entry.date === date ? originalEntry : entry
        );
        setCalendarData(revertedCalendarData);
        throw new Error(`HTTP error! status: \${response.status}`);
      }
      // If successful, the optimistic update remains.
    } catch (err) {
      console.error('Failed to update calendar data:', err);
      setError(err); // Display error to user
    }
  };

  // Refined date range for "last week, this week, next 2 weeks"
  // Let's define "this week" as starting on Monday.
  const getCalendarRange = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday

    // Calculate start of "this week" (Monday)
    const thisWeekMonday = new Date(today);
    thisWeekMonday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); // If Sunday (0), go back 6 days to Monday. Otherwise, go back dayOfWeek-1 days to Monday.

    // Calculate start of "last week" (Monday of last week)
    const lastWeekMonday = new Date(thisWeekMonday);
    lastWeekMonday.setDate(thisWeekMonday.getDate() - 7);

    // Calculate end of "next 2 weeks" (Sunday of the second week from now)
    const nextTwoWeeksSunday = new Date(thisWeekMonday);
    nextTwoWeeksSunday.setDate(thisWeekMonday.getDate() + 13); // 14 days total for two weeks, plus Monday as day 0.

    return { startDate: lastWeekMonday, endDate: nextTwoWeeksSunday };
  };

  useEffect(() => {
    const { startDate, endDate } = getCalendarRange();
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);

    const fetchCalendarData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}?startDate=${formattedStartDate}&endDate=${formattedEndDate}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: \${response.status}`);
        }
        const data = await response.json();
        setCalendarData(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  }, []); // Dependency array ensures it runs once on mount

  if (loading) return <div className="text-center my-5">Loading calendar...</div>;
  if (error) return <div className="text-center my-5 text-danger">Error loading calendar: {error.message}</div>;

  // Group data by date for easier lookup
  const dataByDate = calendarData.reduce((acc, entry) => {
    acc[entry.date] = entry;
    return acc;
  }, {});

  // Generate dates to display in the calendar grid
  const displayDates = [];
  const currentDate = new Date(getCalendarRange().startDate);
  const finalDate = new Date(getCalendarRange().endDate);

  while (currentDate <= finalDate) {
    displayDates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Group dates by week for rendering
  const weeks = [];
  let currentWeek = [];
  displayDates.forEach(date => {
    currentWeek.push(date);
    // If it's Sunday or the last day, push the current week and start a new one
    if (date.getDay() === 0 || date.getTime() === finalDate.getTime()) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });


  return (
    <Container className="my-4">
      <h1 className="text-center mb-4">Calendar Tracker</h1>
      <Row xs={1} md={2} lg={3} className="g-4">
        {weeks.map((week, weekIndex) => (
          <Col key={weekIndex}>
            <Card>
              <Card.Body>
                <Card.Title className="text-center">Week of {formatDate(week[0])}</Card.Title>
                <Row xs={1} className="g-3">
                  {week.map((date) => {
                    const dateStr = formatDate(date);
                    const entry = dataByDate[dateStr] || { date: dateStr, tom_count: 0, charlie_count: 0 };
                    const isToday = new Date().toDateString() === date.toDateString();

                    return (
                      <Col key={dateStr}>
                        <Card className={`day-card ${isToday ? 'today-highlight' : ''}`}>
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <strong className={isToday ? 'text-primary' : ''}>{date.getDate()}</strong>
                              <small className="text-muted">{date.toLocaleDateString('en-US', { weekday: 'short' })}</small>
                            </div>
                            <div className="text-center mb-2">
                              <span className="me-2">
                                Tom: {entry.tom_count}
                              </span>
                              <span>
                                Charlie: {entry.charlie_count}
                              </span>
                            </div>
                            <div className="d-flex justify-content-center gap-2">
                              <Button variant="outline-primary" size="sm" onClick={() => handleSelection(dateStr, 'Tom', 'increment')}>
                                +Tom
                              </Button>
                              <Button variant="outline-secondary" size="sm" onClick={() => handleSelection(dateStr, 'Charlie', 'increment')}>
                                +Charlie
                              </Button>
                            </div>
                            <div className="d-flex justify-content-center gap-2 mt-1">
                                <Button variant="outline-danger" size="sm" onClick={() => handleSelection(dateStr, 'Tom', 'decrement')} disabled={entry.tom_count === 0}>
                                -Tom
                                </Button>
                                <Button variant="outline-dark" size="sm" onClick={() => handleSelection(dateStr, 'Charlie', 'decrement')} disabled={entry.charlie_count === 0}>
                                -Charlie
                                </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
      <style>{`
        .day-card {
          background-color: #f8f9fa;
          border-color: #dee2e6;
          transition: transform 0.2s ease-in-out;
        }
        .day-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 0.5rem 1rem rgba(0,0,0,.15);
        }
        .today-highlight {
          border: 2px solid #007bff; /* Bootstrap primary color */
          background-color: #e7f3ff;
        }
        .today-highlight .card-body {
          padding: 0.8rem;
        }
        .card-body > div > div > button { /* Adjust button padding */
          padding: 0.25rem 0.5rem;
          font-size: 0.875rem;
          line-height: 1.5;
          border-radius: 0.2rem;
        }
        .card-body > div > div > button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .gap-2 {
          gap: 0.5rem; /* Adjust gap */
        }
        .mt-1 {
          margin-top: 0.25rem; /* Adjust margin-top */
        }
      `}</style>
    </Container>
  );
}

export default CalendarView;
