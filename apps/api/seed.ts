import { PrismaClient } from '@prisma/client';
import type { Table } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

function atHour(baseDate: Date, hour: number, minute = 0) {
    const date = new Date(baseDate);
    date.setHours(hour, minute, 0, 0);
    return date;
}

async function seed() {
    console.log('🌱 Starting database seed...\n');

    const password = '123456';
    const passwordHash = await hash(password, 10);

    // 1. Create/Update Users (idempotent)
    console.log('👥 Creating/updating users...');

    const superAdmin = await prisma.user.upsert({
        where: { email: 'superadmin@test.com' },
        update: { passwordHash, role: 'SUPER_ADMIN' },
        create: {
            name: 'Super Admin',
            email: 'superadmin@test.com',
            passwordHash,
            role: 'SUPER_ADMIN',
        },
        select: { id: true, name: true, email: true, role: true },
    });
    console.log('  ✓', superAdmin.name, `(${superAdmin.email})`);

    const owner1 = await prisma.user.upsert({
        where: { email: 'owner1@test.com' },
        update: { passwordHash, role: 'RESTAURANT_ADMIN' },
        create: {
            name: 'Restaurant Owner 1',
            email: 'owner1@test.com',
            passwordHash,
            role: 'RESTAURANT_ADMIN',
        },
        select: { id: true, name: true, email: true, role: true },
    });
    console.log('  ✓', owner1.name, `(${owner1.email})`);

    const owner2 = await prisma.user.upsert({
        where: { email: 'owner2@test.com' },
        update: { passwordHash, role: 'RESTAURANT_ADMIN' },
        create: {
            name: 'Restaurant Owner 2',
            email: 'owner2@test.com',
            passwordHash,
            role: 'RESTAURANT_ADMIN',
        },
        select: { id: true, name: true, email: true, role: true },
    });
    console.log('  ✓', owner2.name, `(${owner2.email})`);

    const customer1 = await prisma.user.upsert({
        where: { email: 'customer1@test.com' },
        update: { passwordHash },
        create: {
            name: 'Test Customer 1',
            email: 'customer1@test.com',
            phone: '+1234567890',
            passwordHash,
            role: 'CUSTOMER',
        },
        select: { id: true, name: true, email: true, role: true },
    });
    console.log('  ✓', customer1.name, `(${customer1.email})`);

    const customer2 = await prisma.user.upsert({
        where: { email: 'customer2@test.com' },
        update: { passwordHash },
        create: {
            name: 'Test Customer 2',
            email: 'customer2@test.com',
            phone: '+0987654321',
            passwordHash,
            role: 'CUSTOMER',
        },
        select: { id: true, name: true, email: true, role: true },
    });
    console.log('  ✓', customer2.name, `(${customer2.email})`);

    // 2. Create Restaurants (idempotent)
    console.log('\n🍽️  Creating restaurants...');

    let restaurant1 = await prisma.restaurant.findFirst({
        where: {
            ownerId: owner1.id,
            name: 'مطعم البحر المتوسط',
        },
    });

    if (!restaurant1) {
        restaurant1 = await prisma.restaurant.create({
            data: {
                name: 'مطعم البحر المتوسط',
                description: 'أشهى الأطباق البحرية الطازجة من البحر المتوسط',
                address: 'شارع الحمرا، بيروت، لبنان',
                phone: '+9611234567',
                openTime: '11:00',
                closeTime: '23:00',
                ownerId: owner1.id,
            },
        });
        console.log('  ✓ Created:', restaurant1.name);
    } else {
        console.log('  ✓ Exists:', restaurant1.name);
    }

    let restaurant2 = await prisma.restaurant.findFirst({
        where: {
            ownerId: owner2.id,
            name: 'مطعم الشام الأصيل',
        },
    });

    if (!restaurant2) {
        restaurant2 = await prisma.restaurant.create({
            data: {
                name: 'مطعم الشام الأصيل',
                description: 'المطبخ الشامي التقليدي بلمسة عصرية',
                address: 'شارع الاستقلال، دمشق، سوريا',
                phone: '+9632345678',
                openTime: '12:00',
                closeTime: '00:00',
                ownerId: owner2.id,
            },
        });
        console.log('  ✓ Created:', restaurant2.name);
    } else {
        console.log('  ✓ Exists:', restaurant2.name);
    }

    // 3. Create Tables for Restaurant 1 (idempotent)
    console.log('\n🪑 Creating tables...');

    const restaurant1TablesCount = await prisma.table.count({
        where: { restaurantId: restaurant1.id },
    });

    let restaurant1Tables: Table[] = [];
    if (restaurant1TablesCount === 0) {
        const tableData1 = [
            { name: 'طاولة 1', capacity: 2, status: 'AVAILABLE' as const },
            { name: 'طاولة 2', capacity: 4, status: 'RESERVED' as const },
            { name: 'طاولة 3', capacity: 6, status: 'OCCUPIED' as const },
            { name: 'طاولة 4', capacity: 4, status: 'AVAILABLE' as const },
            { name: 'طاولة 5', capacity: 8, status: 'AVAILABLE' as const },
        ];

        for (const table of tableData1) {
            const created = await prisma.table.create({
                data: {
                    ...table,
                    restaurantId: restaurant1.id,
                },
            });
            restaurant1Tables.push(created);
        }
        console.log('  ✓ Created 5 tables for', restaurant1.name);
    } else {
        restaurant1Tables = await prisma.table.findMany({
            where: { restaurantId: restaurant1.id },
        });
        console.log('  ✓ Found', restaurant1Tables.length, 'tables for', restaurant1.name);
    }

    // 4. Create Tables for Restaurant 2 (idempotent)
    const restaurant2TablesCount = await prisma.table.count({
        where: { restaurantId: restaurant2.id },
    });

    let restaurant2Tables: Table[] = [];
    if (restaurant2TablesCount === 0) {
        const tableData2 = [
            { name: 'طاولة 1', capacity: 4, status: 'AVAILABLE' as const },
            { name: 'طاولة 2', capacity: 4, status: 'AVAILABLE' as const },
            { name: 'طاولة 3', capacity: 6, status: 'OCCUPIED' as const },
            { name: 'طاولة 4', capacity: 2, status: 'AVAILABLE' as const },
        ];

        for (const table of tableData2) {
            const created = await prisma.table.create({
                data: {
                    ...table,
                    restaurantId: restaurant2.id,
                },
            });
            restaurant2Tables.push(created);
        }
        console.log('  ✓ Created 4 tables for', restaurant2.name);
    } else {
        restaurant2Tables = await prisma.table.findMany({
            where: { restaurantId: restaurant2.id },
        });
        console.log('  ✓ Found', restaurant2Tables.length, 'tables for', restaurant2.name);
    }

    // 5. Reset Reservations and add fresh examples
    console.log('\n📅 Resetting reservations and adding fresh examples...');

    await prisma.reservation.deleteMany();
    await prisma.table.updateMany({
        data: { status: 'AVAILABLE' },
    });

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(now);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const restaurant1Examples = [
        {
            userId: customer1.id,
            restaurantId: restaurant1.id,
            tableId: restaurant1Tables[0].id,
            reservationDate: atHour(tomorrow, 12, 0),
            guestsCount: 2,
            status: 'PENDING' as const,
            notes: 'مثال: حجز بانتظار الموافقة',
        },
        {
            userId: customer2.id,
            restaurantId: restaurant1.id,
            tableId: restaurant1Tables[0].id,
            reservationDate: atHour(tomorrow, 15, 30),
            guestsCount: 2,
            status: 'CONFIRMED' as const,
            notes: 'نفس الطاولة في نفس اليوم ولكن بوقت مختلف',
        },
        {
            userId: customer2.id,
            restaurantId: restaurant1.id,
            tableId: restaurant1Tables[1].id,
            reservationDate: atHour(tomorrow, 18, 0),
            guestsCount: 4,
            status: 'PENDING' as const,
            notes: 'اجتماع عمل',
        },
        {
            userId: customer1.id,
            restaurantId: restaurant1.id,
            tableId: restaurant1Tables[3].id,
            reservationDate: atHour(dayAfterTomorrow, 13, 0),
            guestsCount: 4,
            status: 'CONFIRMED' as const,
            notes: 'غداء عائلي',
        },
    ];

    const restaurant2Examples = [
        {
            userId: customer1.id,
            restaurantId: restaurant2.id,
            tableId: restaurant2Tables[0].id,
            reservationDate: atHour(tomorrow, 12, 0),
            guestsCount: 4,
            status: 'PENDING' as const,
            notes: 'مثال جديد للموافقة',
        },
        {
            userId: customer2.id,
            restaurantId: restaurant2.id,
            tableId: restaurant2Tables[0].id,
            reservationDate: atHour(tomorrow, 15, 0),
            guestsCount: 4,
            status: 'CONFIRMED' as const,
            notes: 'مثال لنفس الطاولة بوقت مختلف',
        },
        {
            userId: customer1.id,
            restaurantId: restaurant2.id,
            tableId: restaurant2Tables[1].id,
            reservationDate: atHour(dayAfterTomorrow, 20, 0),
            guestsCount: 4,
            status: 'PENDING' as const,
            notes: 'حجز مسائي',
        },
    ];

    await prisma.reservation.createMany({
        data: [...restaurant1Examples, ...restaurant2Examples],
    });

    await prisma.table.updateMany({
        where: {
            id: {
                in: [
                    restaurant1Tables[0].id,
                    restaurant1Tables[1].id,
                    restaurant1Tables[3].id,
                    restaurant2Tables[0].id,
                    restaurant2Tables[1].id,
                ],
            },
        },
        data: { status: 'RESERVED' },
    });

    const restaurant1ReservationsCount = restaurant1Examples.length;
    const restaurant2ReservationsCount = restaurant2Examples.length;
    console.log('  ✓ Recreated', restaurant1ReservationsCount, 'reservations for', restaurant1.name);
    console.log('  ✓ Recreated', restaurant2ReservationsCount, 'reservations for', restaurant2.name);

    // Summary
    console.log('\n✅ Seed completed successfully!\n');
    console.log('📊 Summary:');
    console.log('  Users: 5 (1 SUPER_ADMIN, 2 RESTAURANT_ADMIN, 2 CUSTOMER)');
    console.log('  Restaurants: 2');
    console.log('  Tables:', restaurant1Tables.length + restaurant2Tables.length);
    console.log('  Reservations:', (restaurant1ReservationsCount || 5) + (restaurant2ReservationsCount || 3));
    console.log('\n🔑 All test accounts use password: 123456\n');
}

seed()
    .catch((error) => {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
