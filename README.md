# AI Travel Planner

This is a web application that acts as an AI-powered travel guide. Users can search for a location (city or landmark) and receive a curated list of the top 10 tourist attractions with images and short descriptions. They can then click on any attraction to get a full, conversational, and detailed guide.

The project is built with a Python/Flask backend and a simple HTML/CSS/JS frontend. It uses the Gemini API for content generation and caches results in a PostgreSQL database to optimize cost and performance.

## Features

-   **AI-Powered Content**: Uses Google's Gemini model to generate travel content.
-   **Two-Step Generation**: Fetches a list of places first (low cost), then generates details on demand (higher cost), saving API tokens.
-   **Database Caching**: Caches both search results and detailed descriptions to minimize redundant API calls.
-   **Dynamic Image Fetching**: Retrieves images from the Wikipedia API.
-   **Clean, Responsive UI**: Simple and modern user interface that works on different screen sizes.

## Setup and Installation

Follow these steps to set up and run the project locally.

### 1. Prerequisites

-   Python 3.x
-   `pip` for package management
-   A PostgreSQL database

### 2. Clone the Repository

```bash
git clone <your-repository-url>
cd TravelBackend
```

### 3. Install Dependencies

Install all the required Python packages using the `requirements.txt` file.

```bash
pip install -r requirements.txt
```

### 4. Set Up Environment Variables

Create a file named `.env` in the root of the project folder and add your secret keys.

```env
# .env file
GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
DATABASE_URL="YOUR_POSTGRESQL_CONNECTION_URL_HERE"
```

### 5. Initialize the Database

Run the `database.py` script once to create and configure the necessary tables in your database.

```bash
python database.py
```

## Running the Application

1.  **Start the Backend Server**:
    ```bash
    python app.py
    ```
    The server will start on `http://127.0.0.1:5000`.

2.  **Launch the Frontend**:
    -   Navigate to the project folder in your file explorer.
    -   Double-click the `index.html` file to open it in your web browser.