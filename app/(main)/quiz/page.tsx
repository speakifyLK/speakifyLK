import { redirect } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { QuizConfig } from "@/components/quiz/quiz-config";
import { QuizPlay } from "@/components/quiz/quiz-play";
import { Promo } from "@/components/promo";
import { Quests } from "@/components/quests";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { UserProgress } from "@/components/user-progress";
import { getQuizSessionWithQuestions, getUnitsForQuiz, getUserProgress, getUserSubscription } from "@/db/queries";

import { Header } from "../learn/header";

export const dynamic = "force-dynamic";

type QuizPageProps = {
  searchParams: Promise<{ sessionId?: string }>;
};

const QuizPage = async ({ searchParams }: QuizPageProps) => {
  const params = await searchParams;
  const sessionId = params.sessionId ? parseInt(params.sessionId, 10) : null;

  const userProgressData = getUserProgress();
  const unitsData = getUnitsForQuiz();
  const userSubscriptionData = getUserSubscription();

  const [userProgress, units, userSubscription] = await Promise.all([
    userProgressData,
    unitsData,
    userSubscriptionData,
  ]);

  if (!userProgress || !userProgress.activeCourse) redirect("/courses");

  const isPro = !!userSubscription?.isActive;

  // If sessionId is provided, fetch and render the quiz session
  if (sessionId && !isNaN(sessionId)) {
    const session = await getQuizSessionWithQuestions(sessionId);
    
    if (!session) {
      // Session not found or unauthorized, redirect back to config
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

  // Otherwise, render the quiz configuration
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
      </StickyWrapper>
      <FeedWrapper>
        <Header title="Quiz" />
        <QuizConfig units={units} />
      </FeedWrapper>
    </div>
  );
};

export default QuizPage;
