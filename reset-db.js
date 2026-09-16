require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

async function cleanDatabase() {
  try {
    console.log('⏳ Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log(' Connected to database.');

    const db = mongoose.connection.db;

    // ১. টেস্ট অর্ডার ও টেস্ট প্রোডাক্ট সম্পূর্ণ ডিলিট
    await db.collection('orders').deleteMany({});
    console.log('✅ All test orders removed.');

    await db.collection('products').deleteMany({});
    console.log('✅ All test products removed.');

    // ২. অ্যাডমিন রিসেট (আপনার পছন্দমতো মূল অ্যাডমিন সেট করুন)
    await db.collection('admins').deleteMany({});
    await db.collection('admins').insertOne({
      name: 'Super Admin',
      username: 'admin',
      password: 'delibuy123', // লাইভ করার পর এটি পরিবর্তন করে নিবেন
      role: 'Super Admin',
      createdAt: new Date()
    });
    console.log('✅ Admin reset to fresh default: admin / delibuy123');

    console.log('\n🎉 Database is now completely clean and ready for production!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error cleaning database:', err);
    process.exit(1);
  }
}

cleanDatabase();