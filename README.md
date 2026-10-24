# 🚗 BUPGO: A Ride-Sharing Platform for BUP Students

> **Course:** Web Technologies Laboratory (Course Code: ICE-3206)  
> **Department:** Department of Information & Communication Technology (ICT)  
> **Faculty:** Faculty of Science and Technology (FST)  
> **Institution:** Bangladesh University of Professionals (BUP)  
> **Submitted By:**  
> - **Munshi Tanvir Hossain** (ID: 2254901076, Batch: BICE-2024, Session: 2021-22)  
> - **Sulayman Akhand Rahul** (ID: 2354900901014, Batch: BICE-2024, Session: 2022-23)  
> **Submitted To:**  
> - Sharmeen Jahan Seema (Lecturer, Dept. of ICT, BUP)  
> - Md Istakiak Adnan (Lecturer, Dept. of ICT, BUP)

---

## 📌 Project Overview

**BUPGO** is a dedicated campus carpooling and ride-sharing web platform designed specifically for students of **Bangladesh University of Professionals (BUP)** in Mirpur Cantonment, Dhaka. 

Due to the distance, heavy traffic in Dhaka, and high fares of solo CNGs or commercial ride-sharing services (Uber/Pathao), many students face high daily travel expenses. BUPGO connects BUP students living in the same locality (e.g. Mirpur, Uttara, Dhanmondi, Farmgate, Mohakhali) traveling to and from campus on similar schedules, enabling them to easily share rides, split transportation fares, build university camaraderie, and reduce carbon emissions.

---

## 🚀 Key Features Implemented

1. **User Registration & Login (Authentication):**
   - Student authentication using Student ID, BUP Email, and secure password hashing (`bcryptjs` + JWT).
   - Roles: Student Driver (offers rides) and Student Passenger (requests rides).
   - **Quick 1-Click Demo Login:** Dedicated buttons on the login page to immediately test as Munshi Tanvir Hossain, Sulayman Akhand Rahul, Fatima Zahra, Ayman Sadik, or the System Administrator without typing credentials!

2. **Find a Ride (Search & Filter):**
   - Real-time search by Starting Pickup point (Mirpur, Uttara, Dhanmondi, Farmgate, etc.), Destination (BUP Campus), Travel Date, Vehicle Type (Car, Motorbike, CNG), and minimum seats required.
   - Interactive Route Timeline preview, driver department and ID badge, and live available seats count.

3. **Offer a Ride (Post a Ride):**
   - Interactive posting form for student drivers.
   - Convenient BUP popular route preset chips (e.g., Mirpur 10 ➔ BUP for ৳40, Uttara ➔ BUP for ৳70).
   - Dynamic seat limits based on vehicle type (Bike = 1 seat, Car = 3-4 seats, CNG = 2-3 seats).

4. **Ride Details Modal & Driver Contact:**
   - Full route details, scheduled time, vehicle model, and co-passenger list.
   - Secure contact unlocking: driver phone number and direct WhatsApp link become accessible once the ride request is accepted.

5. **Ride Request System:**
   - Passengers can request 1 or more seats with customized pickup spot notes.
   - Real-time status tracking: `pending` ➔ `accepted` / `rejected` / `cancelled`.

6. **My Rides Management (Driver & Passenger Dashboard):**
   - **Driver Tab:** Manage incoming student join requests with interactive **Accept** and **Reject** buttons. Accepting automatically updates the remaining seat count in the NoSQL database!
   - **Passenger Tab:** Track request status, contact the driver via WhatsApp/Phone once confirmed, or cancel requests.

7. **Student Profile & Activity:**
   - Displays student name, ID, department, batch, session, and carpool metrics.
   - Editable contact number, vehicle specifications, and bio.

8. **Admin Panel & NoSQL Database Console:**
   - Real-time metrics: Total Registered Students, Active Rides, Confirmed Carpools, Carbon Emission Reduction (kg CO2).
   - Tabular view of all registered students and active ride posts with administrative deletion controls.

---

## 🗄️ Database Architecture (NoSQL Document Store)

BUPGO implements a **NoSQL Document Database Architecture**:
- **Automatic Embedded NoSQL Engine:** Built-in JSON BSON-compatible document collections stored in `./database/nosql_data/` (`users.json`, `rides.json`, `requests.json`). It runs immediately on any computer with **zero installation or configuration needed**!
- **MongoDB / Mongoose Support:** If an external MongoDB server or MongoDB Atlas URI is specified in `.env` (`MONGODB_URI=mongodb://localhost:27017/bupgo`), the system connects directly to MongoDB.

---

## 🛠️ Technologies Used

- **Frontend:** HTML5, CSS3 (Modern Flexbox, CSS Grid, Glassmorphism, BUP University Theme), Vanilla JavaScript (ES6+ async/await, DOM APIs).
- **Backend:** Node.js (v18+ / v20+ / v24+), Express.js 5.x.
- **Database:** NoSQL Document Store (JSON/BSON collections + MongoDB Mongoose connector).
- **Security & Tokens:** `bcryptjs` for salted password hashing, `jsonwebtoken` (JWT) for secure student sessions.

---

## 🏃 How to Run the Project

### 1. Open Terminal in the project folder
```bash
cd "c:\Users\Tanvir Naeem\OneDrive - Bangladesh University of Professionals\Desktop\Trial projectx"
```

### 2. Start the Application
```bash
npm start
```
*(Or use `node server.js`)*

### 3. Open in Your Browser
Visit: **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Pre-seeded Demo Accounts for Presentation

| Role | Name | Student ID / Email | Password |
|---|---|---|---|
| **Author / Driver** | Munshi Tanvir Hossain | `2254901076` | `bup12345` |
| **Author / Driver** | Sulayman Akhand Rahul | `2354900901014` | `bup12345` |
| **Student Passenger** | Fatima Zahra | `2254901045` | `bup12345` |
| **Student Passenger** | Ayman Sadik | `2254901010` | `bup12345` |
| **Administrator** | BUP ICT Lab Admin | `admin@bup.edu.bd` | `admin123` |

*(Note: You can also use the one-click **"⚡ Quick 1-Click Demo Accounts"** buttons directly on the Login page!)*

---

## 🧪 Running the Automated Test Suite

To verify database operations, user authentication, and ride booking logic:
```bash
node test.js
```
Expected output: `🎉 ALL BUPGO TEST SUITES PASSED CLEANLY (100%)!`
