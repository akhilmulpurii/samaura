import { motion } from "framer-motion";

export default function DisplayEndTime({ time }: { time: string }) {
  if (!time || time === "Invalid Date") return;
  return (
    <motion.div
      className="text-sm text-white/70 ml-4 whitespace-nowrap"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      Ends at {time}
    </motion.div>
  );
}
