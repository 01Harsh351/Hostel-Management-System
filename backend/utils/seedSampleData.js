import Hostel from '../models/Hostel.js';
import Room from '../models/Room.js';

const SAMPLE_HOSTELS = [
  {
    name: 'Aryabhatta Residence Hall',
    type: 'Boys',
    totalRooms: 120,
    address: 'North Campus Avenue, Block A',
    warden: 'Dr. R. Krishnan',
    rooms: [
      { roomNumber: 'A-101', type: 'Single', capacity: 1, occupiedCount: 0, floor: '1st Floor' },
      { roomNumber: 'A-102', type: 'Double', capacity: 2, occupiedCount: 0, floor: '1st Floor' },
      { roomNumber: 'A-204', type: 'Triple', capacity: 3, occupiedCount: 0, floor: '2nd Floor' },
    ],
  },
  {
    name: 'Sarojini Residence Hall',
    type: 'Girls',
    totalRooms: 110,
    address: 'East Academic Quadrant, Block C',
    warden: 'Prof. M. Deshmukh',
    rooms: [
      { roomNumber: 'S-101', type: 'Single', capacity: 1, occupiedCount: 0, floor: '1st Floor' },
      { roomNumber: 'S-102', type: 'Double', capacity: 2, occupiedCount: 0, floor: '1st Floor' },
      { roomNumber: 'S-205', type: 'Triple', capacity: 3, occupiedCount: 0, floor: '2nd Floor' },
    ],
  },
  {
    name: 'Vikram Sarabhai Annex',
    type: 'Boys',
    totalRooms: 80,
    address: 'West Engineering Enclave, Block B',
    warden: 'Dr. S. Kulkarni',
    rooms: [
      { roomNumber: 'V-301', type: 'Double', capacity: 2, occupiedCount: 0, floor: '3rd Floor' },
      { roomNumber: 'V-302', type: 'Single', capacity: 1, occupiedCount: 0, floor: '3rd Floor' },
    ],
  },
];

/**
 * Idempotently seeds realistic sample hostels and rooms into MongoDB Atlas (hostelDB).
 * Existing records are preserved; missing sample hostels/rooms are created cleanly.
 */
export async function seedSampleCampusData() {
  let hostelsCreated = 0;
  let roomsCreated = 0;

  for (const sample of SAMPLE_HOSTELS) {
    let hostel = await Hostel.findOne({ name: sample.name });
    if (!hostel) {
      hostel = await Hostel.create({
        name: sample.name,
        type: sample.type,
        totalRooms: sample.totalRooms,
        address: sample.address,
        warden: sample.warden,
      });
      hostelsCreated += 1;
    }

    for (const roomSpec of sample.rooms) {
      const exists = await Room.findOne({
        hostelId: hostel._id,
        roomNumber: roomSpec.roomNumber,
      });
      if (!exists) {
        await Room.create({
          hostelId: hostel._id,
          roomNumber: roomSpec.roomNumber,
          type: roomSpec.type,
          capacity: roomSpec.capacity,
          occupiedCount: roomSpec.occupiedCount,
          floor: roomSpec.floor,
        });
        roomsCreated += 1;
      }
    }
  }

  return {
    hostelsCreated,
    roomsCreated,
  };
}
