import AppDataSource from "@/config/typeorm";
import { resetDemoData } from "@/crons/demoreset";

// Manual trigger for the same wipe-and-reseed the demo-reset cron runs daily -
// useful to reset the demo on demand instead of waiting for the schedule.
AppDataSource.initialize()
    .then(resetDemoData)
    .then(() => AppDataSource.destroy())
    .then(() => console.log("Demo data reset."))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
