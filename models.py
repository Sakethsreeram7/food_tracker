from datetime import datetime
from flask_login import UserMixin
from __init__ import db

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    meal_opt_ins = db.relationship('UserMealOptIn', backref='user', lazy=True)
    
    def __repr__(self):
        return f'<User {self.email}>'

class MealType(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)  # breakfast, lunch, dinner
    
    def __repr__(self):
        return f'<MealType {self.name}>'

class DailyQRCode(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, unique=True)
    qr_image_path = db.Column(db.String(255), nullable=True)
    token = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<DailyQRCode {self.date}>'

class UserMealOptIn(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    meal_type_id = db.Column(db.Integer, db.ForeignKey('meal_type.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    opted_in = db.Column(db.Boolean, default=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    meal_type = db.relationship('MealType', backref='opt_ins', lazy=True)
    
    # Composite unique constraint
    __table_args__ = (
        db.UniqueConstraint('user_id', 'meal_type_id', 'date', name='unique_user_meal_date'),
    )
    
    def __repr__(self):
        return f'<UserMealOptIn user_id={self.user_id} meal={self.meal_type_id} date={self.date}>'

class WeeklyOptIn(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    meal_type_id = db.Column(db.Integer, db.ForeignKey('meal_type.id'), nullable=False)
    monday = db.Column(db.Boolean, default=False)
    tuesday = db.Column(db.Boolean, default=False)
    wednesday = db.Column(db.Boolean, default=False)
    thursday = db.Column(db.Boolean, default=False)
    friday = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    meal_type = db.relationship('MealType', backref='weekly_opt_ins', lazy=True)
    
    # Composite unique constraint
    __table_args__ = (
        db.UniqueConstraint('user_id', 'meal_type_id', name='unique_user_meal_weekly'),
    )
    
    def __repr__(self):
        return f'<WeeklyOptIn user_id={self.user_id} meal={self.meal_type_id}>'

class OptInSchedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    day_of_week = db.Column(db.Integer, nullable=False)  # 0=Monday, 6=Sunday
    open_time = db.Column(db.Time, nullable=False)
    close_time = db.Column(db.Time, nullable=False)
    is_weekend_rule = db.Column(db.Boolean, default=False)
    
    def __repr__(self):
        return f'<OptInSchedule day={self.day_of_week} open={self.open_time} close={self.close_time}>'
