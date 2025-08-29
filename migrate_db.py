import os
import sqlite3
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

def migrate_sqlite_to_postgres():
    """
    Migrate data from SQLite to PostgreSQL
    
    This script should be run after deploying to Railway and setting up PostgreSQL,
    but before using the application in production.
    
    Make sure to set the DATABASE_URL environment variable before running this script.
    """
    # Get PostgreSQL connection string from environment variable
    database_url = os.environ.get('DATABASE_URL')
    
    if not database_url:
        print("Error: DATABASE_URL environment variable not set.")
        print("Please set the DATABASE_URL environment variable to your PostgreSQL connection string.")
        return
    
    # Convert Heroku/Railway style postgres:// URLs to postgresql://
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    
    # Connect to SQLite database
    sqlite_conn = sqlite3.connect('instance/lunch_track.db')
    sqlite_cursor = sqlite_conn.cursor()
    
    # Connect to PostgreSQL database
    try:
        pg_conn = psycopg2.connect(database_url)
        pg_conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        pg_cursor = pg_conn.cursor()
    except Exception as e:
        print(f"Error connecting to PostgreSQL: {e}")
        return
    
    # Get all tables from SQLite
    sqlite_cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = sqlite_cursor.fetchall()
    
    # Migrate each table
    for table in tables:
        table_name = table[0]
        
        # Skip SQLite internal tables
        if table_name.startswith('sqlite_'):
            continue
        
        print(f"Migrating table: {table_name}")
        
        # Get table schema
        sqlite_cursor.execute(f"PRAGMA table_info({table_name});")
        columns = sqlite_cursor.fetchall()
        column_names = [column[1] for column in columns]
        
        # Get all data from SQLite table
        sqlite_cursor.execute(f"SELECT * FROM {table_name};")
        rows = sqlite_cursor.fetchall()
        
        if not rows:
            print(f"  No data in table {table_name}, skipping...")
            continue
        
        # Insert data into PostgreSQL table
        for row in rows:
            # Create placeholders for the SQL query
            placeholders = ', '.join(['%s'] * len(row))
            columns_str = ', '.join(column_names)
            
            # Insert the row into PostgreSQL
            try:
                pg_cursor.execute(
                    f"INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING;",
                    row
                )
            except Exception as e:
                print(f"  Error inserting row into {table_name}: {e}")
                continue
        
        print(f"  Migrated {len(rows)} rows from {table_name}")
    
    # Close connections
    sqlite_conn.close()
    pg_conn.close()
    
    print("Migration completed successfully!")

if __name__ == "__main__":
    migrate_sqlite_to_postgres()
