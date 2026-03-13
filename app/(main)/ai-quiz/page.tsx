import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

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
    sessionId && !isNaN(sessionId)
      ? getQuizSessionWithQuestions(sessionId)
      : Promise.resolve(null);
  const unitsPromise =
    !sessionId || isNaN(sessionId) ? getUnitsForQuiz() : Promise.resolve([]);
  const quizHistoryPromise =
    !sessionId || isNaN(sessionId) ? getQuizHistory() : Promise.resolve([]);

  const [userProgress, userSubscription, session, units, quizHistory] =
    await Promise.all([
      userProgressPromise,
      userSubscriptionPromise,
      sessionPromise,
      unitsPromise,
      quizHistoryPromise,
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
    mainContent = <QuizConfig units={units} basePath="/ai-quiz" />;
    
    sidebarStats = (
      <div className="mt-4 rounded-xl border-2 border-slate-200 p-4">
        <h3 className="text-lg font-bold text-neutral-700">Quiz History</h3>
        {quizHistory.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No quizzes taken yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {quizHistory.slice(0, 5).map((quiz) => (
              <div
                key={quiz.id}
                className="flex items-center justify-between rounded-lg border-2 p-3"
              >
                <div className="flex flex-col">
                  <span className="max-w-[120px] truncate text-sm font-bold text-neutral-700">
                    {quiz.topic}
                  </span>
                  <span className="text-xs capitalize text-neutral-500">{quiz.difficulty}</span>
                </div>
                <div className="flex items-center gap-1 text-sm font-bold text-green-500">
                  {Math.round(quiz.score)}%
                </div>
              </div>
            ))}
          </div>
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
