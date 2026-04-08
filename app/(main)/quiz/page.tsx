import { redirect } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { QuizConfig } from "@/components/quiz/quiz-config";
import { QuizPlay } from "@/components/quiz/quiz-play";
import { Promo } from "@/components/promo";
import { Quests } from "@/components/quests";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { UserProgress } from "@/components/user-progress";
import {
  getQuizHistory,
  getQuizSessionWithQuestions,
  getStreakData,
  getUnitsForQuiz,
  getUserProgress,
  getUserSubscription,
} from "@/db/queries";

import { Header } from "../learn/header";

export const dynamic = "force-dynamic";

type QuizPageProps = {
  searchParams: Promise<{ sessionId?: string }>;
};

const QuizPage = async ({ searchParams }: QuizPageProps) => {
  const params = await searchParams;
  const sessionId = params.sessionId ? parseInt(params.sessionId, 10) : null;

  if (sessionId && !isNaN(sessionId)) {
    const [userProgress, userSubscription, session, streakData] = await Promise.all([
      getUserProgress(),
      getUserSubscription(),
      getQuizSessionWithQuestions(sessionId),
      getStreakData(),
    ]);

    if (!userProgress || !userProgress.activeCourse) redirect("/courses");

    const isPro = !!userSubscription?.isActive;

    if (!session) {
      redirect("/quiz");
    }

    return (
      <div className="flex flex-row-reverse gap-[48px] px-6">
        <StickyWrapper>
          <UserProgress
            activeCourse={userProgress.activeCourse}
            hearts={userProgress.hearts}
            points={userProgress.points}
            hasActiveSubscription={isPro}
            streak={streakData.currentStreak}
          />

          {!isPro && <Promo />}
          <Quests points={userProgress.points} />
        </StickyWrapper>
        <FeedWrapper>
          <Header title="Quiz" />
          <QuizPlay session={session} />
        </FeedWrapper>
      </div>
    );
  }

  const [userProgress, units, userSubscription, quizHistory, streakData] = await Promise.all([
    getUserProgress(),
    getUnitsForQuiz(),
    getUserSubscription(),
    getQuizHistory(),
    getStreakData(),
  ]);

  if (!userProgress || !userProgress.activeCourse) redirect("/courses");

  const isPro = !!userSubscription?.isActive;

  return (
    <div className="flex flex-row-reverse gap-[48px] px-6">
      <StickyWrapper>
        <UserProgress
          activeCourse={userProgress.activeCourse}
          hearts={userProgress.hearts}
          points={userProgress.points}
          hasActiveSubscription={isPro}
          streak={streakData.currentStreak}
        />

        {!isPro && <Promo />}
        <Quests points={userProgress.points} />
      </StickyWrapper>
      <FeedWrapper>
        <Header title="Quiz" />
        <QuizConfig units={units} quizHistory={quizHistory} />
      </FeedWrapper>
    </div>
  );
};

export default QuizPage;
