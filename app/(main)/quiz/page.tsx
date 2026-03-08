import { redirect } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { QuizConfig } from "@/components/quiz/quiz-config";
import { Promo } from "@/components/promo";
import { Quests } from "@/components/quests";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { UserProgress } from "@/components/user-progress";
import { getUnits, getUserProgress, getUserSubscription } from "@/db/queries";

import { Header } from "../learn/header";

export const dynamic = "force-dynamic";

const QuizPage = async () => {
  const userProgressData = getUserProgress();
  const unitsData = getUnits();
  const userSubscriptionData = getUserSubscription();

  const [userProgress, units, userSubscription] = await Promise.all([
    userProgressData,
    unitsData,
    userSubscriptionData,
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

