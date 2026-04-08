import { neon } from "@neondatabase/serverless";
import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/db/schema";

const sql = neon(process.env.DATABASE_URL);

const db = drizzle(sql, { schema });

// ============================================================
// SINHALA LESSON CONTENT
// ============================================================

// Helper to create challenge options compactly
const opt = (text: string, correct: boolean, imageSrc?: string, audioSrc?: string) => ({
  text,
  correct,
  imageSrc,
  audioSrc,
});

// ----- UNIT 1: Learn the basics of Sinhala -----

const unit1Lessons = [
  {
    title: "Nouns",
    order: 1,
    challenges: [
      {
        type: "SELECT" as const,
        question: 'Which one of these is "the man"?',
        order: 1,
        options: [
          opt("මිනිහා", true, "/man.svg"),
          opt("කාන්තාව", false, "/woman.svg"),
          opt("කොල්ලා", false, "/boy.svg"),
        ],
      },
      {
        type: "SELECT" as const,
        question: 'Which one of these is "the woman"?',
        order: 2,
        options: [
          opt("කාන්තාව", true, "/woman.svg"),
          opt("කොල්ලා", false, "/boy.svg"),
          opt("මිනිහා", false, "/man.svg"),
        ],
      },
      {
        type: "SELECT" as const,
        question: 'Which one of these is "the boy"?',
        order: 3,
        options: [
          opt("කොල්ලා", true, "/boy.svg"),
          opt("කාන්තාව", false, "/woman.svg"),
          opt("මිනිහා", false, "/man.svg"),
        ],
      },
      {
        type: "ASSIST" as const,
        question: '"the man"',
        order: 4,
        options: [opt("මිනිහා", true), opt("කාන්තාව", false), opt("කොල්ලා", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one of these is "the girl"?',
        order: 5,
        options: [
          opt("කෙල්ල", true, "/girl.svg"),
          opt("කොල්ලා", false, "/boy.svg"),
          opt("කාන්තාව", false, "/woman.svg"),
        ],
      },
      {
        type: "SELECT" as const,
        question: 'Which one of these is "the zombie"?',
        order: 6,
        options: [
          opt("සොම්බිය", true, "/zombie.svg"),
          opt("රොබෝ", false, "/robot.svg"),
          opt("මිනිහා", false, "/man.svg"),
        ],
      },
      {
        type: "SELECT" as const,
        question: 'Which one of these is "the robot"?',
        order: 7,
        options: [
          opt("රොබෝ", true, "/robot.svg"),
          opt("සොම්බිය", false, "/zombie.svg"),
          opt("කෙල්ල", false, "/girl.svg"),
        ],
      },
      {
        type: "ASSIST" as const,
        question: '"the girl"',
        order: 8,
        options: [opt("කෙල්ල", true), opt("කොල්ලා", false), opt("කාන්තාව", false)],
      },
    ],
  },
  {
    title: "Verbs",
    order: 2,
    challenges: [
      {
        type: "SELECT" as const,
        question: 'Which one means "to eat"?',
        order: 1,
        options: [opt("කනවා", true), opt("බොනවා", false), opt("යනවා", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "to drink"?',
        order: 2,
        options: [opt("බොනවා", true), opt("කනවා", false), opt("එනවා", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "to go"?',
        order: 3,
        options: [opt("යනවා", true), opt("එනවා", false), opt("කනවා", false)],
      },
      {
        type: "ASSIST" as const,
        question: '"to come"',
        order: 4,
        options: [opt("එනවා", true), opt("යනවා", false), opt("බොනවා", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "to see"?',
        order: 5,
        options: [opt("බලනවා", true), opt("කියනවා", false), opt("කනවා", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "to say"?',
        order: 6,
        options: [opt("කියනවා", true), opt("බලනවා", false), opt("බොනවා", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "to come"?',
        order: 7,
        options: [opt("එනවා", true), opt("කනවා", false), opt("බලනවා", false)],
      },
      {
        type: "ASSIST" as const,
        question: '"to see"',
        order: 8,
        options: [opt("බලනවා", true), opt("යනවා", false), opt("කියනවා", false)],
      },
    ],
  },
  {
    title: "Adjectives",
    order: 3,
    challenges: [
      {
        type: "SELECT" as const,
        question: 'Which one means "big"?',
        order: 1,
        options: [opt("ලොකු", true), opt("පොඩි", false), opt("හොඳ", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "small"?',
        order: 2,
        options: [opt("පොඩි", true), opt("ලොකු", false), opt("නරක", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "good"?',
        order: 3,
        options: [opt("හොඳ", true), opt("නරක", false), opt("ලොකු", false)],
      },
      {
        type: "ASSIST" as const,
        question: '"bad"',
        order: 4,
        options: [opt("නරක", true), opt("හොඳ", false), opt("පොඩි", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "beautiful"?',
        order: 5,
        options: [opt("ලස්සන", true), opt("උස", false), opt("ලොකු", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "tall"?',
        order: 6,
        options: [opt("උස", true), opt("ලස්සන", false), opt("පොඩි", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "small"?',
        order: 7,
        options: [opt("පොඩි", true), opt("හොඳ", false), opt("උස", false)],
      },
      {
        type: "ASSIST" as const,
        question: '"beautiful"',
        order: 8,
        options: [opt("ලස්සන", true), opt("ලොකු", false), opt("නරක", false)],
      },
    ],
  },
  {
    title: "Phrases",
    order: 4,
    challenges: [
      {
        type: "SELECT" as const,
        question: 'Which one means "hello"?',
        order: 1,
        options: [opt("ආයුබෝවන්", true), opt("ස්තූතියි", false), opt("සමාවෙන්න", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "thank you"?',
        order: 2,
        options: [opt("ස්තූතියි", true), opt("ආයුබෝවන්", false), opt("කරුණාකරල", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "sorry"?',
        order: 3,
        options: [opt("සමාවෙන්න", true), opt("ස්තූතියි", false), opt("ආයුබෝවන්", false)],
      },
      {
        type: "ASSIST" as const,
        question: '"please"',
        order: 4,
        options: [opt("කරුණාකරල", true), opt("සමාවෙන්න", false), opt("ස්තූතියි", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "good morning"?',
        order: 5,
        options: [opt("සුභ උදෑසනක්", true), opt("සුභ රාත්‍රියක්", false), opt("ආයුබෝවන්", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "good night"?',
        order: 6,
        options: [opt("සුභ රාත්‍රියක්", true), opt("සුභ උදෑසනක්", false), opt("ස්තූතියි", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "hello"?',
        order: 7,
        options: [opt("ආයුබෝවන්", true), opt("කරුණාකරල", false), opt("සුභ උදෑසනක්", false)],
      },
      {
        type: "ASSIST" as const,
        question: '"thank you"',
        order: 8,
        options: [opt("ස්තූතියි", true), opt("ආයුබෝවන්", false), opt("කරුණාකරල", false)],
      },
    ],
  },
  {
    title: "Sentences",
    order: 5,
    challenges: [
      {
        type: "SELECT" as const,
        question: 'Which one means "I am going"?',
        order: 1,
        options: [opt("මම යනවා", true), opt("ඔහු කනවා", false), opt("ඇය එනවා", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "He is eating"?',
        order: 2,
        options: [opt("ඔහු කනවා", true), opt("මම යනවා", false), opt("ඇය එනවා", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "She is coming"?',
        order: 3,
        options: [opt("ඇය එනවා", true), opt("ඔහු කනවා", false), opt("අපි බොනවා", false)],
      },
      {
        type: "ASSIST" as const,
        question: '"We are drinking"',
        order: 4,
        options: [opt("අපි බොනවා", true), opt("මම යනවා", false), opt("ඔහු කනවා", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "I am eating"?',
        order: 5,
        options: [opt("මම කනවා", true), opt("ඔහු යනවා", false), opt("ඇය බොනවා", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "He is going"?',
        order: 6,
        options: [opt("ඔහු යනවා", true), opt("මම කනවා", false), opt("ඇය එනවා", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "She is eating"?',
        order: 7,
        options: [opt("ඇය කනවා", true), opt("මම එනවා", false), opt("ඔහු බොනවා", false)],
      },
      {
        type: "ASSIST" as const,
        question: '"I am coming"',
        order: 8,
        options: [opt("මම එනවා", true), opt("ඔහු කනවා", false), opt("ඇය යනවා", false)],
      },
    ],
  },
];

// ----- UNIT 2: Learn intermediate Sinhala -----

const unit2Lessons = [
  {
    title: "Nouns",
    order: 1,
    challenges: [
      {
        type: "SELECT" as const,
        question: 'Which one means "house"?',
        order: 1,
        options: [opt("ගෙදර", true), opt("පාසල", false), opt("වතුර", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "school"?',
        order: 2,
        options: [opt("පාසල", true), opt("ගෙදර", false), opt("බත", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "water"?',
        order: 3,
        options: [opt("වතුර", true), opt("බත", false), opt("ගෙදර", false)],
      },
      {
        type: "ASSIST" as const,
        question: '"rice"',
        order: 4,
        options: [opt("බත", true), opt("වතුර", false), opt("පාසල", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "tree"?',
        order: 5,
        options: [opt("ගස", true), opt("මල", false), opt("පොත", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "flower"?',
        order: 6,
        options: [opt("මල", true), opt("ගස", false), opt("කෑම", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "book"?',
        order: 7,
        options: [opt("පොත", true), opt("කෑම", false), opt("ගස", false)],
      },
      {
        type: "ASSIST" as const,
        question: '"food"',
        order: 8,
        options: [opt("කෑම", true), opt("පොත", false), opt("මල", false)],
      },
    ],
  },
  {
    title: "Verbs",
    order: 2,
    challenges: [
      {
        type: "SELECT" as const,
        question: 'Which one means "to write"?',
        order: 1,
        options: [opt("ලියනවා", true), opt("කියවනවා", false), opt("දුවනවා", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "to read"?',
        order: 2,
        options: [opt("කියවනවා", true), opt("ලියනවා", false), opt("නිදනවා", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "to run"?',
        order: 3,
        options: [opt("දුවනවා", true), opt("නිදනවා", false), opt("ලියනවා", false)],
      },
      {
        type: "ASSIST" as const,
        question: '"to sleep"',
        order: 4,
        options: [opt("නිදනවා", true), opt("දුවනවා", false), opt("කියවනවා", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "to play"?',
        order: 5,
        options: [opt("සෙල්ලම් කරනවා", true), opt("ඉගෙන ගන්නවා", false), opt("වැඩ කරනවා", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "to learn"?',
        order: 6,
        options: [opt("ඉගෙන ගන්නවා", true), opt("සෙල්ලම් කරනවා", false), opt("ලියනවා", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "to work"?',
        order: 7,
        options: [opt("වැඩ කරනවා", true), opt("ඉගෙන ගන්නවා", false), opt("දුවනවා", false)],
      },
      {
        type: "ASSIST" as const,
        question: '"to write"',
        order: 8,
        options: [opt("ලියනවා", true), opt("නිදනවා", false), opt("සෙල්ලම් කරනවා", false)],
      },
    ],
  },
  {
    title: "Adjectives",
    order: 3,
    challenges: [
      {
        type: "SELECT" as const,
        question: 'Which one means "red"?',
        order: 1,
        options: [opt("රතු", true), opt("නිල්", false), opt("කහ", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "blue"?',
        order: 2,
        options: [opt("නිල්", true), opt("රතු", false), opt("සුදු", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "yellow"?',
        order: 3,
        options: [opt("කහ", true), opt("කළු", false), opt("රතු", false)],
      },
      {
        type: "ASSIST" as const,
        question: '"white"',
        order: 4,
        options: [opt("සුදු", true), opt("කළු", false), opt("නිල්", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "black"?',
        order: 5,
        options: [opt("කළු", true), opt("සුදු", false), opt("කොළ", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "green"?',
        order: 6,
        options: [opt("කොළ", true), opt("කහ", false), opt("නිල්", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "red"?',
        order: 7,
        options: [opt("රතු", true), opt("කොළ", false), opt("සුදු", false)],
      },
      {
        type: "ASSIST" as const,
        question: '"blue"',
        order: 8,
        options: [opt("නිල්", true), opt("කහ", false), opt("කළු", false)],
      },
    ],
  },
  {
    title: "Phrases",
    order: 4,
    challenges: [
      {
        type: "SELECT" as const,
        question: 'Which one means "How are you?"?',
        order: 1,
        options: [opt("ඔබට කොහොමද?", true), opt("මට හොඳින්", false), opt("ඔබේ නම මොකද්ද?", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "I am fine"?',
        order: 2,
        options: [opt("මට හොඳින්", true), opt("ඔබට කොහොමද?", false), opt("මගේ නම...", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "What is your name?"?',
        order: 3,
        options: [opt("ඔබේ නම මොකද්ද?", true), opt("මට හොඳින්", false), opt("ඔබට කොහොමද?", false)],
      },
      {
        type: "ASSIST" as const,
        question: '"My name is..."',
        order: 4,
        options: [opt("මගේ නම...", true), opt("ඔබේ නම මොකද්ද?", false), opt("මට හොඳින්", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "How much is this?"?',
        order: 5,
        options: [opt("මේක කීයද?", true), opt("මට තේරුණේ නැහැ", false), opt("ඔබට කොහොමද?", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "I don\'t understand"?',
        order: 6,
        options: [opt("මට තේරුණේ නැහැ", true), opt("මේක කීයද?", false), opt("මට හොඳින්", false)],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "How are you?"?',
        order: 7,
        options: [opt("ඔබට කොහොමද?", true), opt("මගේ නම...", false), opt("මේක කීයද?", false)],
      },
      {
        type: "ASSIST" as const,
        question: '"I don\'t understand"',
        order: 8,
        options: [
          opt("මට තේරුණේ නැහැ", true),
          opt("ඔබේ නම මොකද්ද?", false),
          opt("මට හොඳින්", false),
        ],
      },
    ],
  },
  {
    title: "Sentences",
    order: 5,
    challenges: [
      {
        type: "SELECT" as const,
        question: 'Which one means "The child goes to school"?',
        order: 1,
        options: [
          opt("ළමයා පාසලට යනවා", true),
          opt("කාන්තාව බත කනවා", false),
          opt("මිනිහා වතුර බොනවා", false),
        ],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "The woman eats rice"?',
        order: 2,
        options: [
          opt("කාන්තාව බත කනවා", true),
          opt("ළමයා පාසලට යනවා", false),
          opt("කෙල්ල පොත කියවනවා", false),
        ],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "The man drinks water"?',
        order: 3,
        options: [
          opt("මිනිහා වතුර බොනවා", true),
          opt("කාන්තාව බත කනවා", false),
          opt("කොල්ලා දුවනවා", false),
        ],
      },
      {
        type: "ASSIST" as const,
        question: '"The girl reads a book"',
        order: 4,
        options: [
          opt("කෙල්ල පොත කියවනවා", true),
          opt("ළමයා පාසලට යනවා", false),
          opt("කාන්තාව බත කනවා", false),
        ],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "The boy runs"?',
        order: 5,
        options: [
          opt("කොල්ලා දුවනවා", true),
          opt("මිනිහා වතුර බොනවා", false),
          opt("කෙල්ල පොත කියවනවා", false),
        ],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "The man works"?',
        order: 6,
        options: [
          opt("මිනිහා වැඩ කරනවා", true),
          opt("කොල්ලා දුවනවා", false),
          opt("ළමයා පාසලට යනවා", false),
        ],
      },
      {
        type: "SELECT" as const,
        question: 'Which one means "The woman writes"?',
        order: 7,
        options: [
          opt("කාන්තාව ලියනවා", true),
          opt("මිනිහා වැඩ කරනවා", false),
          opt("කොල්ලා දුවනවා", false),
        ],
      },
      {
        type: "ASSIST" as const,
        question: '"The boy learns"',
        order: 8,
        options: [
          opt("කොල්ලා ඉගෙන ගන්නවා", true),
          opt("කාන්තාව ලියනවා", false),
          opt("මිනිහා වැඩ කරනවා", false),
        ],
      },
    ],
  },
];

// ============================================================
// SEED DATABASE
// ============================================================

const main = async () => {
  try {
    console.log("Seeding database");

    // Delete all existing data (sequential to avoid deadlocks from FK constraints)
    await db.delete(schema.challengeOptions);
    await db.delete(schema.userProgress);
    await db.delete(schema.challenges);
    await db.delete(schema.lessons);
    await db.delete(schema.units);
    await db.delete(schema.courses);
    await db.delete(schema.userSubscription);

    // Insert courses
    const [sinhalaCourse] = await db
      .insert(schema.courses)
      .values([{ title: "Sinhala", imageSrc: "/lk.jpg" }])
      .returning();

    const [tamilCourse] = await db
      .insert(schema.courses)
      .values([{ title: "Tamil", imageSrc: "/lk.jpg" }])
      .returning();

    console.log(
      `Created courses: Sinhala (id: ${sinhalaCourse.id}), Tamil (id: ${tamilCourse.id})`
    );

    // ---- Seed Sinhala course content ----

    const unitsData = [
      {
        title: "Unit 1",
        description: "Learn the basics of Sinhala",
        order: 1,
        lessons: unit1Lessons,
      },
      {
        title: "Unit 2",
        description: "Learn intermediate Sinhala",
        order: 2,
        lessons: unit2Lessons,
      },
    ];

    for (const unitData of unitsData) {
      const [unit] = await db
        .insert(schema.units)
        .values({
          courseId: sinhalaCourse.id,
          title: unitData.title,
          description: unitData.description,
          order: unitData.order,
        })
        .returning();

      console.log(`  Created ${unitData.title}: ${unitData.description}`);

      for (const lessonData of unitData.lessons) {
        const [lesson] = await db
          .insert(schema.lessons)
          .values({
            unitId: unit.id,
            title: lessonData.title,
            order: lessonData.order,
          })
          .returning();

        console.log(`    Created lesson: ${lessonData.title}`);

        for (const challengeData of lessonData.challenges) {
          const [challenge] = await db
            .insert(schema.challenges)
            .values({
              lessonId: lesson.id,
              type: challengeData.type,
              question: challengeData.question,
              order: challengeData.order,
            })
            .returning();

          await db.insert(schema.challengeOptions).values(
            challengeData.options.map((option) => ({
              challengeId: challenge.id,
              text: option.text,
              correct: option.correct,
              imageSrc: option.imageSrc,
              audioSrc: option.audioSrc,
            }))
          );
        }
      }
    }

    console.log("Database seeded successfully");
  } catch (error) {
    console.error(error);
    throw new Error("Failed to seed database");
  }
};

void main();
