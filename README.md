<img src="https://capsule-render.vercel.app/api?type=waving&color=0:f953c6,100:b91d73&height=220&section=header&text=Cake+Tuition+Management+System&fontSize=42&fontColor=ffffff&fontAlignY=38&desc=Smart+Tuition+Centre+Management+Platform&descAlignY=58&descSize=16&animation=fadeIn" width="100%"/>

<div align="center">

[![React](https://img.shields.io/badge/React.js-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![C#](https://img.shields.io/badge/C%23_ASP.NET-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![SQL](https://img.shields.io/badge/SQL_Database-CC2927?style=for-the-badge&logo=microsoftsqlserver&logoColor=white)]()
[![QR Code](https://img.shields.io/badge/QR_Code_Scanner-222222?style=for-the-badge&logo=qrcode&logoColor=white)]()

</div>

> ⚠️ **Note:** This repository contains the **React frontend** of the Cake Tuition Management System.
> The backend is built with **C# ASP.NET** and **SQL**

---

## 🎂 About

**Cake Tuition Management System** is a full-stack web application designed to manage the complete operations of a tuition centre digitally. The platform is built around **three distinct user roles** — Admin, Teacher, and Student — each with their own dedicated portal and clearly defined responsibilities.

The system handles everything from student enrollment and class assignments to attendance tracking via **QR code scanning**, payment recording, and course material sharing — making tuition centre management seamless, paperless, and efficient.

> 📌 This README documents the **React Frontend** only.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React.js |
| **Backend** | C# ASP.NET *(separate repository)* |
| **Database** | SQL *(separate repository)* |
| **Attendance** | QR Code Generation & Scanner |

---

## ⚙️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or above)
- [npm](https://www.npmjs.com/)

---

### 🚀 Running the Frontend

**1. Clone the repository**
```bash
git clone https://github.com/Gamibro/CakeTuition.git
```

**2. Navigate to the project directory**
```bash
cd CakeTuition
```

**3. Install all dependencies**
```bash
npm install
```

**4. Start the development server**
```bash
npm start
```

Runs at **http://localhost:3000**

> 💡 Make sure the **C# ASP.NET backend** is running on its configured port so that API calls from the frontend resolve correctly.

---

## 👥 User Roles

---

### 🛡️ Admin

The Admin is the **sole operator** of the Cake Tuition Management System with complete control over all students, teachers, classes, payments, and attendance.

**👤 Student & Teacher Management**
- ➕ Enroll new students into the system
- 👨‍🏫 Add and manage teacher accounts
- 🔗 Assign students to their relevant teacher
- 📋 View and manage all registered students and teachers

**🏫 Class Management**
- ➕ Create new classes and assign them to teachers
- 📂 Assign existing classes to available teachers
- 📅 Manage class schedules and timetables across the centre
- 📋 View all classes and their assigned teachers

**📷 QR Code Attendance System**
- Upon enrollment, each student is automatically issued a **unique QR code**
- The QR code contains the student's full enrollment details, course timing, and attendance information
- The QR code is provided to the teacher, who uses the **built-in QR scanner** in the system to mark student attendance for each class session

**💳 Payment Management**
- 💰 Record and manage payments for student enrollments
- 📊 View payment history and outstanding balances per student
- 🧾 Maintain financial records for all enrolled students

**📊 Attendance Monitoring**
- 👁️ View attendance records for all students across all classes
- 📅 Monitor attendance trends and flag absences

---

### 👩‍🏫 Teacher

The Teacher manages their own classes, students, and course materials within the system.

**📅 Timetable & Class Management**
- 📋 View their assigned class and course timetables
- 🗓️ Manage their personal teaching schedule
- 📂 View all classes assigned to them by the Admin

**👥 Student Management**
- 👁️ View the full list of students enrolled in their classes
- ➕ Independently enroll new students into their own classes

**📷 Attendance Tracking**
- 📱 Use the **built-in QR scanner** to scan student QR codes
- ✅ Mark attendance for each student in their class sessions
- 📊 View attendance records for their own students

**📝 Course Materials**
- 📤 Submit and upload notes for students to reference
- 📋 Create and assign homework or assignments to their class students
- 🗂️ Manage all previously submitted notes and assignments

---

### 🎓 Student

The Student has access to a self-service portal to manage their learning journey — from viewing enrollments to accessing teacher materials.

**📚 Enrollment & Courses**
- 👁️ View all active course enrollments
- 📋 Check details of their assigned courses including schedule and timing
- 👨‍🏫 View the profile and details of their assigned teacher

**📷 QR Code**
- 🪪 Each student holds a **unique QR code** issued upon enrollment
- The QR code is used by the teacher to mark their attendance at each class session

**📝 Notes & Assignments**
- 📖 Access all notes submitted by their teacher
- 📋 View assignments and homework uploaded by their teacher
- 🗂️ Refer back to past submissions at any time

**📅 Schedule & Attendance**
- 🗓️ View their full course and class schedule
- 📊 Check their own attendance records across all enrolled classes



## ✨ Feature Summary

| Feature | Admin | Teacher | Student |
|---|:---:|:---:|:---:|
| Enroll Students | ✅ | ✅ | ❌ |
| Assign Students to Teachers | ✅ | ❌ | ❌ |
| Create & Assign Classes | ✅ | ❌ | ❌ |
| View Class Timetable | ✅ | ✅ | ✅ |
| QR Code Generation | ✅ | ❌ | ❌ |
| QR Code Attendance Scanning | ❌ | ✅ | ❌ |
| View Attendance Records | ✅ | ✅ (Own) | ✅ (Own) |
| Record Payments | ✅ | ❌ | ❌ |
| Submit Notes & Assignments | ❌ | ✅ | ❌ |
| View Notes & Assignments | ❌ | ✅ | ✅ |
| View Assigned Teacher | ❌ | ❌ | ✅ |
| Manage All Users | ✅ | ❌ | ❌ |

---

## 📫 Contact

Built by **Gamith Ranasinghe**

📧 [gamithranasinghe001@gmail.com](mailto:gamithranasinghe001@gmail.com)
🔗 [LinkedIn](https://linkedin.com/in/gamith-ranasinghe)
💻 [GitHub](https://github.com/Gamibro)

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:b91d73,100:f953c6&height=120&section=footer&animation=fadeIn" width="100%"/>
