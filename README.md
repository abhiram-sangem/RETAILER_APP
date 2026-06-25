A Simple App for Retailer Billing and Product Management

A full-stack application featuring a Spring Boot backend and an integrated React frontend. The project is structured so that the frontend assets are automatically compiled and served directly by the backend server when running from your IDE.

🛠️ Prerequisites
Before running this project, ensure you have the following installed on your machine:

Java Development Kit (JDK 17 or higher)

An IDE (e.g., IntelliJ IDEA, VS Code, Eclipse, or Spring Tool Suite)

MySQL Server

💡 Note: You do not need Node.js or NPM installed globally on your machine. The build process automatically downloads and manages a local Node environment within the project using Maven.

🚀 Getting Started

1. Clone the Repository
   Bash
   git clone <github-repo-url>
   cd <project-folder-name>
2. Database Setup
   Open your MySQL terminal or MySQL Workbench

Create a new database schema for the application:

SQL

CREATE DATABASE <shopping_cart_db>;

3. Configure Database Credentials

Open the project in your IDE, navigate to src/main/resources/application.properties, and update the connection properties with your local MySQL username and password:

Properties

spring.datasource.url=jdbc:mysql://localhost:3306/<shopping_cart_db>
spring.datasource.username=YOUR_MYSQL_USERNAME
spring.datasource.password=YOUR_MYSQL_PASSWORD

# Automatically creates/updates database tables based on Java entities

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
💻 How to Run Directly via Your IDE
Because the React application is fully integrated into the Maven lifecycle, your IDE can build the frontend and launch the entire application seamlessly.

Step 1: Sync and Build the Frontend Assets
Before launching the application for the first time (or whenever you make changes to frontend files), Maven needs to compile the React app into the backend's static directory.

Option A (Using IDE Terminal): Open the built-in terminal at the root of your project and run:

Bash
mvn clean package -DskipTests
Option B (Using IDE GUI): Open your IDE's Maven tool window, navigate to Lifecycle, and double-click package.

Step 2: Run the Application
Find your main Spring Boot application class (the file annotated with @SpringBootApplication, usually located under src/main/java/...).

Click the green Run or Debug button next to the class name or at the top of your IDE dashboard.

The unified application will spin up, and you can access both the user interface and the API endpoints in your browser at:

👉 http://localhost:8080
