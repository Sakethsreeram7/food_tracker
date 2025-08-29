import os
from datetime import datetime, time
from werkzeug.security import generate_password_hash
from app import app
from models import User, MealType, OptInSchedule
from __init__ import db

def init_db():
    """Initialize the database with test users, meal types, and schedules."""
    with app.app_context():
        # Create tables if they don't exist
        db.create_all()
        
        # Initialize meal types if they don't exist
        if MealType.query.count() == 0:
            breakfast = MealType(name="Breakfast")
            lunch = MealType(name="Lunch")
            dinner = MealType(name="Dinner")
            
            db.session.add(breakfast)
            db.session.add(lunch)
            db.session.add(dinner)
            db.session.commit()
            print("Meal types initialized.")
        
        # Initialize opt-in schedules if they don't exist
        if OptInSchedule.query.count() == 0:
            # Weekday schedules (Monday-Thursday)
            for day in range(0, 4):  # Monday(0) to Thursday(3)
                weekday_schedule = OptInSchedule(
                    day_of_week=day,
                    open_time=time(20, 0),  # 8:00 PM
                    close_time=time(9, 0),  # 9:00 AM next day
                    is_weekend_rule=False
                )
                db.session.add(weekday_schedule)
            
            # Friday schedule
            friday_schedule = OptInSchedule(
                day_of_week=4,  # Friday
                open_time=time(20, 0),  # 8:00 PM
                close_time=time(9, 0),  # 9:00 AM next day
                is_weekend_rule=False
            )
            db.session.add(friday_schedule)
            
            # Weekend schedule (Friday evening to Sunday)
            weekend_schedule = OptInSchedule(
                day_of_week=5,  # Saturday (representing weekend)
                open_time=time(20, 0),  # Friday 8:00 PM
                close_time=time(16, 0),  # Sunday 4:00 PM
                is_weekend_rule=True
            )
            db.session.add(weekend_schedule)
            
            # Sunday to Monday schedule
            sunday_monday_schedule = OptInSchedule(
                day_of_week=6,  # Sunday
                open_time=time(16, 0),  # Sunday 4:00 PM (closed)
                close_time=time(20, 0),  # Monday 8:00 PM (reopens)
                is_weekend_rule=True
            )
            db.session.add(sunday_monday_schedule)
            
            db.session.commit()
            print("Opt-in schedules initialized.")
        
        # Check if users already exist
        if User.query.count() > 0:
            print("Database already contains users. Skipping user initialization.")
            return
        
        # Create admin user
        admin = User(
            name="Admin User",
            email="admin@example.com",
            password_hash=generate_password_hash("admin123"),
            is_admin=True,
            created_at=datetime.utcnow()
        )
        
        # Create regular users
        user1 = User(
            name="John Doe",
            email="john@example.com",
            password_hash=generate_password_hash("password123"),
            is_admin=False,
            created_at=datetime.utcnow()
        )
        
        user2 = User(
            name="Jane Smith",
            email="jane@example.com",
            password_hash=generate_password_hash("password123"),
            is_admin=False,
            created_at=datetime.utcnow()
        )
        
        # Add users to the database
        db.session.add(admin)
        db.session.add(user1)
        db.session.add(user2)
        
        # Commit changes
        db.session.commit()
        
        print("Database initialized with test users:")
        print("Admin: admin@example.com / admin123")
        print("User 1: john@example.com / password123")
        print("User 2: jane@example.com / password123")

if __name__ == "__main__":
    init_db()
