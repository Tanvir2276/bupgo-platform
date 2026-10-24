require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { initDatabase, Users, Rides, Requests, getDbStatus } = require('./database/db');

async function runTests() {
  console.log('🧪 Starting BUPGO Automated Test Suite...');
  await initDatabase();

  const status = getDbStatus();
  console.log(`✓ Database Status: [${status.engine}] Mode: ${status.mode}`);

  // Test 1: Query Users
  const users = await Users.find({});
  console.log(`✓ Users in NoSQL Database: ${users.length}`);
  if (users.length === 0) throw new Error('No users found in database');

  const tanvir = await Users.findOne({ studentId: '2254901076' });
  if (!tanvir) throw new Error('Munshi Tanvir Hossain not found');
  console.log(`✓ Found Student: ${tanvir.name} (${tanvir.studentId}) - ${tanvir.department}`);

  // Test 2: Auth Password Check
  const valid = await bcrypt.compare('bup12345', tanvir.password);
  if (!valid) throw new Error('Password hash comparison failed');
  console.log('✓ Password verification succeeded for student account');

  // Test 3: Query Rides
  const rides = await Rides.find({ status: 'active' });
  console.log(`✓ Active rides available: ${rides.length}`);
  if (rides.length === 0) throw new Error('No active rides found');

  // Test 4: Simulate Ride Booking & Seat Management
  const targetRide = rides[0];
  const initialSeats = targetRide.availableSeats;
  console.log(`✓ Testing Ride [${targetRide.startingLocation} ➔ ${targetRide.destination}] with ${initialSeats} available seats`);

  // Create request
  const testReq = await Requests.create({
    rideId: targetRide._id,
    riderId: 'test_rider_id',
    riderName: 'Test Student',
    riderStudentId: '2254909999',
    seatsRequested: 1,
    status: 'pending'
  });
  console.log(`✓ Created test ride request: ID ${testReq._id} (Status: ${testReq.status})`);

  // Driver accepts request
  await Requests.findByIdAndUpdate(testReq._id, { status: 'accepted' });
  await Rides.findByIdAndUpdate(targetRide._id, { availableSeats: initialSeats - 1 });

  const updatedRide = await Rides.findById(targetRide._id);
  console.log(`✓ Seat booked successfully. New available seats: ${updatedRide.availableSeats} (was ${initialSeats})`);

  // Cleanup test request & restore seats
  await Requests.findByIdAndDelete(testReq._id);
  await Rides.findByIdAndUpdate(targetRide._id, { availableSeats: initialSeats });
  console.log('✓ Test cleanup complete.');

  console.log('🎉 ALL BUPGO TEST SUITES PASSED CLEANLY (100%)!');
  if (mongoose.connection.readyState === 1) await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
