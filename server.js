require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { initDatabase, getDbStatus, Users, Rides, Requests, Notifications } = require('./database/db');
const { seedData } = require('./database/seed');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'bupgo_ice3206_secret_key_2026';

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please login.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Session expired or invalid token. Please login again.' });
    }
    req.user = user;
    next();
  });
}

// Optional Auth (for routes where guests can browse, but logged in users see extra info)
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) req.user = user;
      next();
    });
  } else {
    next();
  }
}

/* =========================================================
   AUTH ROUTES
   ========================================================= */

// Quick demo login list for testing and project defense
app.get('/api/auth/quick-users', async (req, res) => {
  try {
    const allUsers = await Users.find({});
    const safeList = allUsers.map(u => ({
      id: u._id,
      name: u.name,
      studentId: u.studentId,
      department: u.department,
      batch: u.batch,
      email: u.email,
      role: u.role,
      vehicleType: u.vehicleType || 'None'
    }));
    res.json({ success: true, users: safeList });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, studentId, email, phone, department, batch, session, role, vehicleType, vehicleModel, password } = req.body;

    if (!name || !studentId || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields (Name, Student ID, Email, Password).' });
    }

    const existingStudent = await Users.findOne({
      $or: [{ email: email.toLowerCase() }, { studentId: studentId.trim() }]
    });

    if (existingStudent) {
      return res.status(400).json({ success: false, message: 'A student account already exists with this Email or Student ID.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await Users.create({
      name: name.trim(),
      studentId: studentId.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || '',
      department: department || 'General',
      batch: batch || 'BICE-2024',
      session: session || '2022-23',
      role: role || 'passenger',
      vehicleType: vehicleType || '',
      vehicleModel: vehicleModel || '',
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      password: passwordHash,
      bio: 'BUP Student carpooler.'
    });

    const token = jwt.sign(
      { id: newUser._id, studentId: newUser.studentId, role: newUser.role, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userSafe } = newUser;
    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to BUPGO.',
      token,
      user: userSafe
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { loginId, password } = req.body; // Can be email or studentId

    if (!loginId || !password) {
      return res.status(400).json({ success: false, message: 'Student ID / Email and Password are required.' });
    }

    // Try finding by studentId or email
    const cleanId = loginId.trim();
    let user = await Users.findOne({ studentId: cleanId });
    if (!user) {
      user = await Users.findOne({ email: cleanId.toLowerCase() });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Account not found. Please check your Student ID / Email or register.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid password. Please try again.' });
    }

    const token = jwt.sign(
      { id: user._id, studentId: user.studentId, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userSafe } = user;
    res.json({
      success: true,
      message: 'Login successful! Welcome back.',
      token,
      user: userSafe
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// Get Current User Profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const { password: _, ...userSafe } = user;
    res.json({ success: true, user: userSafe });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update Profile
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, department, batch, vehicleType, vehicleModel, bio, avatar } = req.body;
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (phone) updateData.phone = phone.trim();
    if (department) updateData.department = department.trim();
    if (batch) updateData.batch = batch.trim();
    if (vehicleType !== undefined) updateData.vehicleType = vehicleType;
    if (vehicleModel !== undefined) updateData.vehicleModel = vehicleModel;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar) updateData.avatar = avatar;

    const updatedUser = await Users.findByIdAndUpdate(req.user.id, updateData);
    const { password: _, ...userSafe } = updatedUser;
    res.json({ success: true, message: 'Profile updated successfully!', user: userSafe });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================
   RIDES API
   ========================================================= */

// Get Rides with Search and Filters
app.get('/api/rides', optionalAuth, async (req, res) => {
  try {
    const { start, destination, date, vehicle, minSeats, status, sort, tripType } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    } else {
      filter.status = 'active'; // default only active rides
    }

    if (tripType && tripType !== 'all') {
      filter.tripType = tripType;
    }

    if (start && start.trim()) {
      filter.startingLocation = { $regex: start.trim(), $options: 'i' };
    }

    if (destination && destination.trim()) {
      filter.destination = { $regex: destination.trim(), $options: 'i' };
    }

    if (date && date.trim()) {
      filter.travelDate = date.trim();
    }

    if (vehicle && vehicle !== 'All') {
      filter.transportationType = vehicle;
    }

    let rides = await Rides.find(filter);

    // Filter available seats if specified
    if (minSeats) {
      rides = rides.filter(r => Number(r.availableSeats) >= Number(minSeats));
    }

    // User requirement: "find ride a top rated gula age thakbe" (Top rated rides first)
    const sortBy = sort || 'top_rated';
    if (sortBy === 'lowest_fare') {
      rides.sort((a, b) => Number(a.estimatedCost || 0) - Number(b.estimatedCost || 0));
    } else if (sortBy === 'time') {
      rides.sort((a, b) => new Date(a.travelDate + ' ' + a.departureTime) - new Date(b.travelDate + ' ' + b.departureTime));
    } else {
      // Default: Top rated drivers first (highest rating -> most reviews)
      rides.sort((a, b) => {
        const ratingA = Number(a.driverRating !== undefined ? a.driverRating : 4.8);
        const ratingB = Number(b.driverRating !== undefined ? b.driverRating : 4.8);
        if (ratingB !== ratingA) return ratingB - ratingA;
        return (Number(b.driverReviews || 0) - Number(a.driverReviews || 0));
      });
    }

    res.json({ success: true, count: rides.length, rides });
  } catch (err) {
    console.error('Error fetching rides:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Single Ride Details (including requests & accepted passengers)
app.get('/api/rides/:id', optionalAuth, async (req, res) => {
  try {
    const ride = await Rides.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found.' });
    }

    // Get requests for this ride
    const requests = await Requests.find({ rideId: ride._id });
    const acceptedRequests = requests.filter(r => r.status === 'accepted');

    // Check if the requesting user has already requested this ride
    let myRequest = null;
    if (req.user) {
      myRequest = requests.find(r => String(r.riderId) === String(req.user.id)) || null;
    }

    res.json({
      success: true,
      ride,
      acceptedCount: acceptedRequests.length,
      acceptedPassengers: acceptedRequests.map(r => ({
        riderName: r.riderName,
        riderDept: r.riderDept,
        seatsRequested: r.seatsRequested,
        pickupLocation: r.pickupLocation
      })),
      myRequest
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Offer / Create a Ride
app.post('/api/rides', authenticateToken, async (req, res) => {
  try {
    const {
      startingLocation,
      destination,
      travelDate,
      departureTime,
      availableSeats,
      transportationType,
      vehicleModel,
      estimatedCost,
      additionalInfo
    } = req.body;

    if (!startingLocation || !destination || !travelDate || !departureTime || !availableSeats) {
      return res.status(400).json({ success: false, message: 'Please provide all essential ride details.' });
    }

    const driver = await Users.findById(req.user.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver user profile not found.' });
    }

    // Enable everyone registered to offer rides (auto-upgrade role if passenger)
    if (driver.role !== 'driver' && driver.role !== 'admin') {
      await Users.findByIdAndUpdate(driver._id, { role: 'driver' });
    }

    const isReturn = startingLocation.toLowerCase().includes('bup');
    const tripType = req.body.tripType || (isReturn ? 'return' : 'to_campus');

    const seats = parseInt(availableSeats, 10);
    const newRide = await Rides.create({
      driverId: driver._id,
      driverName: driver.name,
      driverStudentId: driver.studentId,
      driverDept: driver.department,
      driverPhone: driver.phone,
      driverAvatar: driver.avatar,
      driverRating: driver.rating || 5.0,
      driverReviews: driver.totalReviews || 12,
      tripType: tripType,
      startingLocation: startingLocation.trim(),
      destination: destination.trim(),
      travelDate: travelDate.trim(),
      departureTime: departureTime.trim(),
      totalSeats: seats,
      availableSeats: seats,
      transportationType: transportationType || 'Car',
      vehicleModel: vehicleModel ? vehicleModel.trim() : (driver.vehicleModel || 'Standard'),
      estimatedCost: Number(estimatedCost) || 0,
      status: 'active',
      additionalInfo: additionalInfo ? additionalInfo.trim() : 'Commuting to/from BUP Campus.'
    });

    // Generate real-time alert/notification for all students
    try {
      await Notifications.create({
        title: '🚗 New Ride Alert!',
        message: `${newRide.driverName} posted a ride: ${newRide.startingLocation} ➔ ${newRide.destination} (${newRide.departureTime}) - ৳${newRide.estimatedCost}/seat.`,
        type: 'ride_posted',
        rideId: newRide._id
      });
    } catch (e) {
      console.warn('Notification log error:', e.message);
    }

    res.status(201).json({
      success: true,
      message: 'Ride posted successfully! Other BUP students can now view and request your ride.',
      ride: newRide
    });
  } catch (err) {
    console.error('Error posting ride:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update Ride Status or Details
app.put('/api/rides/:id', authenticateToken, async (req, res) => {
  try {
    const ride = await Rides.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found.' });
    }

    if (String(ride.driverId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You are not authorized to edit this ride.' });
    }

    const updated = await Rides.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true, message: 'Ride updated successfully!', ride: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Cancel / Delete a Ride
app.delete('/api/rides/:id', authenticateToken, async (req, res) => {
  try {
    const ride = await Rides.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found.' });
    }

    if (String(ride.driverId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this ride.' });
    }

    await Rides.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Ride cancelled and removed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================
   RIDE REQUESTS API
   ========================================================= */

// Request to join a ride
app.post('/api/requests', authenticateToken, async (req, res) => {
  try {
    const { rideId, seatsRequested, pickupLocation, notes } = req.body;

    if (!rideId) {
      return res.status(400).json({ success: false, message: 'Ride ID is required.' });
    }

    const ride = await Rides.findById(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found or expired.' });
    }

    if (String(ride.driverId) === String(req.user.id)) {
      return res.status(400).json({ success: false, message: 'You cannot request to join your own ride post.' });
    }

    const requestedSeats = parseInt(seatsRequested || 1, 10);
    if (requestedSeats > ride.availableSeats) {
      return res.status(400).json({
        success: false,
        message: `Only ${ride.availableSeats} seat(s) available on this ride.`
      });
    }

    // Check if user already requested
    const existingReq = await Requests.findOne({
      rideId: ride._id,
      riderId: req.user.id,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingReq) {
      return res.status(400).json({
        success: false,
        message: `You already have an active request (${existingReq.status}) for this ride.`
      });
    }

    const rider = await Users.findById(req.user.id);

    const newRequest = await Requests.create({
      rideId: ride._id,
      riderId: rider._id,
      riderName: rider.name,
      riderStudentId: rider.studentId,
      riderDept: rider.department,
      riderPhone: rider.phone,
      seatsRequested: requestedSeats,
      pickupLocation: pickupLocation || ride.startingLocation,
      notes: notes || '',
      status: 'pending'
    });

    try {
      await Notifications.create({
        title: '🎫 Seat Request Received',
        message: `${rider.name} (${rider.department}) requested ${requestedSeats} seat(s) on your ride to ${ride.destination}.`,
        type: 'seat_request',
        targetUserId: String(ride.driverId)
      });
    } catch(e) {}

    res.status(201).json({
      success: true,
      message: 'Request sent to driver! The driver will review and accept your request.',
      request: newRequest
    });
  } catch (err) {
    console.error('Error creating ride request:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update Request Status (Driver accepts/rejects)
app.put('/api/requests/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body; // 'accepted' | 'rejected' | 'cancelled'
    if (!['accepted', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const request = await Requests.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const ride = await Rides.findById(request.rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Associated ride not found.' });
    }

    const isDriver = String(ride.driverId) === String(req.user.id);
    const isRider = String(request.riderId) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isDriver && !isRider && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized action.' });
    }

    // If driver accepts: deduct availableSeats
    if (status === 'accepted') {
      if (!isDriver && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Only the driver can accept requests.' });
      }

      if (request.status !== 'accepted') {
        if (ride.availableSeats < request.seatsRequested) {
          return res.status(400).json({
            success: false,
            message: `Not enough available seats! Available: ${ride.availableSeats}, Requested: ${request.seatsRequested}`
          });
        }

        const newSeats = ride.availableSeats - request.seatsRequested;
        await Rides.findByIdAndUpdate(ride._id, {
          availableSeats: newSeats,
          status: newSeats <= 0 ? 'full' : ride.status
        });
      }
    }

    // If was accepted and now rejected/cancelled: restore seats
    if ((status === 'rejected' || status === 'cancelled') && request.status === 'accepted') {
      const restoredSeats = ride.availableSeats + request.seatsRequested;
      await Rides.findByIdAndUpdate(ride._id, {
        availableSeats: restoredSeats,
        status: 'active'
      });
    }

    const updatedRequest = await Requests.findByIdAndUpdate(request._id, { status });

    try {
      await Notifications.create({
        title: status === 'accepted' ? '🎉 Ride Confirmed!' : 'Ride Request Update',
        message: status === 'accepted' ? `Your ride to ${ride.destination} has been confirmed by the driver! Driver contact is now unlocked.` : `Your ride request was marked as ${status}.`,
        type: 'request_status',
        targetUserId: String(request.riderId)
      });
    } catch(e) {}

    res.json({
      success: true,
      message: `Request marked as ${status}.`,
      request: updatedRequest
    });
  } catch (err) {
    console.error('Error updating request status:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================================================
   MY RIDES & DASHBOARD API
   ========================================================= */

// Get user's offered rides + requested rides
app.get('/api/users/my-rides', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Rides posted by this user
    const postedRides = await Rides.find({ driverId: userId });

    // Attach incoming passenger requests to each posted ride
    const postedWithRequests = await Promise.all(
      postedRides.map(async ride => {
        const reqs = await Requests.find({ rideId: ride._id });
        return {
          ...ride,
          requests: reqs
        };
      })
    );

    // 2. Rides requested by this user
    const myRequests = await Requests.find({ riderId: userId });
    const requestedWithRideInfo = await Promise.all(
      myRequests.map(async reqDoc => {
        const ride = await Rides.findById(reqDoc.rideId);
        return {
          request: reqDoc,
          ride: ride || null
        };
      })
    );

    res.json({
      success: true,
      postedRides: postedWithRequests,
      requestedRides: requestedWithRideInfo
    });
  } catch (err) {
    console.error('Error in my-rides:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin & Platform Stats
app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalStudents = await Users.countDocuments();
    const totalRides = await Rides.countDocuments();
    const activeRides = await Rides.countDocuments({ status: 'active' });
    const totalRequests = await Requests.countDocuments();
    const acceptedCarpools = await Requests.countDocuments({ status: 'accepted' });

    const allUsers = await Users.find({});
    const safeUsers = allUsers.map(u => ({
      _id: u._id,
      name: u.name,
      studentId: u.studentId,
      department: u.department,
      batch: u.batch,
      role: u.role,
      phone: u.phone,
      email: u.email
    }));

    const allRides = await Rides.find({});

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalRides,
        activeRides,
        totalRequests,
        acceptedCarpools,
        co2SavedKg: acceptedCarpools * 4.2 // Carpool eco-impact metric
      },
      users: safeUsers,
      rides: allRides,
      dbStatus: getDbStatus()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Notifications API
app.get('/api/notifications', async (req, res) => {
  try {
    const list = await Notifications.find({});
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, count: list.length, notifications: list.slice(0, 30) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// System Status Endpoint
app.get('/api/system/status', (req, res) => {
  res.json({
    project: 'BUPGO - BUP Ride Sharing Platform',
    course: 'Web Technologies Laboratory (ICE-3206)',
    university: 'Bangladesh University of Professionals (BUP)',
    database: getDbStatus(),
    uptimeSeconds: process.uptime()
  });
});

// Fallback for non-API client routes
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server and initialize NoSQL database
async function startServer() {
  await initDatabase();
  await seedData();

  const server = app.listen(PORT, '0.0.0.0', () => {
    const os = require('os');
    const nets = os.networkInterfaces();
    let networkIp = 'localhost';
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          networkIp = net.address;
          break;
        }
      }
    }

    console.log(`====================================================`);
    console.log(`   🚗 BUPGO Ride-Sharing Platform is LIVE!`);
    console.log(`   💻 Laptop / PC:  http://localhost:${PORT}`);
    console.log(`   📱 Mobile Phone: http://${networkIp}:${PORT}`);
    console.log(`   🗄️ Database:     MongoDB NoSQL Database`);
    console.log(`   🎓 Course:       ICE-3206 Web Technologies Laboratory`);
    console.log(`   🏛️ BUP - Bangladesh University of Professionals`);
    console.log(`====================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} is currently in use. Trying port ${Number(PORT) + 1}...`);
      app.listen(Number(PORT) + 1, () => {
        console.log(`✓ BUPGO running on: http://localhost:${Number(PORT) + 1}`);
      });
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer();
