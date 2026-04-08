import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
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

    if (!userProgress || !userProgress.activeCourse) redirect("/learn");

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
          <div className="sticky top-0 mb-5 flex items-center justify-between border-b-2 bg-white pb-3 text-neutral-400 lg:z-50 lg:mt-[-28px] lg:pt-[28px]">
            <Button asChild size="sm" variant="ghost">
              <Link href="/learn">
                <ArrowLeft className="h-5 w-5 stroke-2 text-neutral-400" />
              </Link>
            </Button>
            <h1 className="text-lg font-bold">Quiz</h1>
            <div aria-hidden />
          </div>
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

  if (!userProgress || !userProgress.activeCourse) redirect("/learn");

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
        <div className="sticky top-0 mb-5 flex items-center justify-between border-b-2 bg-white pb-3 text-neutral-400 lg:z-50 lg:mt-[-28px] lg:pt-[28px]">
          <Button asChild size="sm" variant="ghost">
            <Link href="/learn">
              <ArrowLeft className="h-5 w-5 stroke-2 text-neutral-400" />
            </Link>
          </Button>
          <h1 className="text-lg font-bold">Quiz</h1>
          <div aria-hidden />
        </div>
        <QuizConfig units={units} quizHistory={quizHistory} />
      </FeedWrapper>
    </div>
  );
};

export default QuizPage;
