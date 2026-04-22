const fs = require('fs/promises');
const path = require('path');

const SCHEDULES_PATH = path.join(__dirname, '..', 'data', 'schedules.json');

async function readSchedules() {
  try {
    const content = await fs.readFile(SCHEDULES_PATH, 'utf8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function saveSchedule(schedule) {
  const schedules = await readSchedules();
  schedules.push(schedule);
  await fs.writeFile(SCHEDULES_PATH, JSON.stringify(schedules, null, 2));
  return schedule;
}

module.exports = {
  readSchedules,
  saveSchedule,
};
