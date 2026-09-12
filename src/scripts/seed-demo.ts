import AppDataSource from "@/config/typeorm";
import { User } from "@/models/user";
import { Conversation } from "@/models/conversation";
import bcrypt from "bcrypt";

const ACCOUNTS = [
    { name: "Ana", lastname: "Mercier", email: "ana.demo@tooms.app", password: "tooms-demo-1" },
    { name: "Ben", lastname: "Kowalski", email: "ben.demo@tooms.app", password: "tooms-demo-2" },
];

export async function seedDemo() {
    const userRepo = AppDataSource.getRepository(User);
    const conversationRepo = AppDataSource.getRepository(Conversation);

    const users: User[] = [];
    for (const account of ACCOUNTS) {
        let user = await userRepo.findOne({ where: { email: account.email } });
        if (!user) {
            const hash = await bcrypt.hash(account.password, 10);
            user = await userRepo.save({
                name: account.name,
                lastname: account.lastname,
                email: account.email,
                password: hash,
            });
            console.log(`Created demo user ${account.email}`);
        } else {
            console.log(`Demo user ${account.email} already exists`);
        }
        users.push(user);
    }

    const [ana, ben] = users;

    // Link the two demo accounts as contacts of each other
    for (const [owner, other] of [[ana, ben], [ben, ana]]) {
        const withContacts = await userRepo.findOne({ where: { id: owner.id }, relations: { contacts: true } });
        if (!withContacts) continue;
        if (withContacts.contacts.some((contact) => contact.id === other.id)) continue;
        withContacts.contacts = [...withContacts.contacts, other];
        await userRepo.save(withContacts);
    }
    console.log("Linked demo accounts as contacts");

    // Make sure they already share a conversation so the demo works right after login
    const existing = await conversationRepo
        .createQueryBuilder("conversation")
        .innerJoin("conversation.participants", "p1", "p1.id = :anaId", { anaId: ana.id })
        .innerJoin("conversation.participants", "p2", "p2.id = :benId", { benId: ben.id })
        .getOne();

    if (!existing) {
        await conversationRepo.save({ participants: [ana, ben] });
        console.log("Created demo conversation between Ana and Ben");
    } else {
        console.log("Demo conversation already exists");
    }
}

// Only run as a standalone script (`npm run seed:demo`); the demo-reset cron
// imports seedDemo() directly and reuses the already-initialized connection.
if (require.main === module) {
    AppDataSource.initialize()
        .then(seedDemo)
        .then(() => AppDataSource.destroy())
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}
