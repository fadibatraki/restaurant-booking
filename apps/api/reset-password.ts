import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

async function resetPassword() {
    const prisma = new PrismaClient();

    try {
        const email = 'restaurantadmin@test.com';
        const newPassword = '123456';

        // Hash the new password
        const passwordHash = await hash(newPassword, 10);

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });

        let user;

        if (existingUser) {
            // User exists - update password and ensure role is RESTAURANT_ADMIN
            user = await prisma.user.update({
                where: { email },
                data: {
                    passwordHash,
                    role: 'RESTAURANT_ADMIN',
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                },
            });
            console.log('✅ Password updated for existing user');
        } else {
            // User doesn't exist - create new user
            user = await prisma.user.create({
                data: {
                    name: 'Restaurant Admin',
                    email,
                    passwordHash,
                    role: 'RESTAURANT_ADMIN',
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                },
            });
            console.log('✅ New user created');
        }

        console.log('\nUser details:');
        console.log('  ID:', user.id);
        console.log('  Name:', user.name);
        console.log('  Email:', user.email);
        console.log('  Role:', user.role);
        console.log('  Created:', user.createdAt);
        console.log('\nYou can now login with:');
        console.log('  Email:', email);
        console.log('  Password:', newPassword);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

resetPassword();
