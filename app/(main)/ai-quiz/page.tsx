import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { FeedWrapper } from "@/components/feed-wrapper";
import { QuizConfig } from "@/components/quiz/quiz-config";
import { QuizPlay } from "@/components/quiz/quiz-play";
import { QuizHistory } from "@/components/quiz/quiz-history";
import { Promo } from "@/components/promo";
import { Quests } from "@/components/quests";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { UserProgress } from "@/components/user-progress";
import {
  getQuizHistory,
  getQuizSessionWithQuestions,
  getQuizStats,
  getUnitsForQuiz,
  getUserProgress,
  getUserSubscription,
} from "@/db/queries";

import { Header } from "../learn/header";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ sessionId?: string }>;
};

const AIQuizPage = async ({ searchParams }: Props) => {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  const sessionId = params.sessionId ? parseInt(params.sessionId, 10) : null;

  const userProgressPromise = getUserProgress();
  const userSubscriptionPromise = getUserSubscription();
  const sessionPromise =
    sessionId && !isNaN(sessionId) ? getQuizSessionWithQuestions(sessionId) : Promise.resolve(null);
  const unitsPromise = !sessionId || isNaN(sessionId) ? getUnitsForQuiz() : Promise.resolve([]);
  const quizHistoryPromise =
    !sessionId || isNaN(sessionId) ? getQuizHistory() : Promise.resolve([]);
  const quizStatsPromise = !sessionId || isNaN(sessionId) ? getQuizStats() : Promise.resolve(null);

  const [userProgress, userSubscription, session, units, quizHistory, quizStats] =
    await Promise.all([
      userProgressPromise,
      userSubscriptionPromise,
      sessionPromise,
      unitsPromise,
      quizHistoryPromise,
      quizStatsPromise,
    ]);

  if (!userProgress || !userProgress.activeCourse) {
    redirect("/courses");
  }

  const isPro = !!userSubscription?.isActive;

  if (sessionId && !isNaN(sessionId) && !session) {
    redirect("/ai-quiz");
  }

  let mainContent;
  let sidebarStats = null;

  if (session) {
    mainContent = <QuizPlay session={session} backHref="/ai-quiz" />;
  } else {
    mainContent = (
      <div className="flex flex-col gap-4">
        <QuizConfig units={units} basePath="/ai-quiz" />
        {quizStats && (
          <QuizHistory
            history={quizHistory}
            stats={{
              totalQuizzes: quizStats.totalQuizzes,
              averageScore: quizStats.averageScore,
              favouriteTopic: quizStats.favouriteTopic,
              improvementTrend: quizStats.improvementTrend,
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-row-reverse gap-[48px] px-6">
      <StickyWrapper>
        <UserProgress
          activeCourse={userProgress.activeCourse}
          hearts={userProgress.hearts}
          points={userProgress.points}
          hasActiveSubscription={isPro}
        />
        {!isPro && <Promo />}
        <Quests points={userProgress.points} />
        {sidebarStats}
      </StickyWrapper>
      <FeedWrapper>
        <Header title="AI Quiz" />
        {mainContent}
      </FeedWrapper>
    </div>
  );
};

export default AIQuizPage;
