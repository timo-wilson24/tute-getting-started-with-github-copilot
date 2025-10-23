import copy
from fastapi.testclient import TestClient
from src import app as _app

client = TestClient(_app.app)

# Make a deep copy of the initial activities to restore between tests
_original_activities = copy.deepcopy(_app.activities)


def setup_function():
    # Restore the in-memory activities before each test
    _app.activities.clear()
    for k, v in copy.deepcopy(_original_activities).items():
        _app.activities[k] = v


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    # Each activity should have required keys
    for act in data:
        assert "name" in act
        assert "description" in act
        assert "participants" in act


def test_signup_and_remove_participant():
    activity_name = "Chess Club"
    email = "teststudent@mergington.edu"

    # Ensure email not already present
    assert email not in _app.activities[activity_name]["participants"]

    # Signup
    resp = client.post(f"/activities/{activity_name}/signup?email={email}")
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")
    assert email in _app.activities[activity_name]["participants"]

    # Removing the participant
    resp = client.delete(f"/activities/{activity_name}/participants?email={email}")
    assert resp.status_code == 200
    assert "Removed" in resp.json().get("message", "")
    assert email not in _app.activities[activity_name]["participants"]


def test_remove_nonexistent_participant():
    activity_name = "Programming Class"
    email = "nobody@mergington.edu"

    # Ensure email not present
    if email in _app.activities[activity_name]["participants"]:
        _app.activities[activity_name]["participants"].remove(email)

    resp = client.delete(f"/activities/{activity_name}/participants?email={email}")
    assert resp.status_code == 404


def test_remove_from_nonexistent_activity():
    resp = client.delete(f"/activities/NotAnActivity/participants?email=someone@x.com")
    assert resp.status_code == 404
