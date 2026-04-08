import Image from "next/image";
import { redirect } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { ActivityHeatmap } from "@/components/profile/activity-heatmap";
import { StreakCard } from "@/components/profile/streak-card";
import { StatsOverview } from "@/components/profile/stats-overview";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { UserProgress } from "@/components/user-progress";
import { Promo } from "@/components/promo";
import {
  getProfileStats,
  getQuizStats,
  getStreakData,
  getUserActivityHeatmap,
  getUserProgress,
  getUserSubscription,
} from "@/db/queries";

export const dynamic = "force-dynamic";

const ProfilePage = async () => {
  const userProgressData = getUserProgress();
  const userSubscriptionData = getUserSubscription();
  const profileStatsData = getProfileStats();
  const quizStatsData = getQuizStats();
  const activityHeatmapData = getUserActivityHeatmap(365);
  const streakDataPromise = getStreakData();

  const [userProgress, userSubscription, profileStats, quizStats, activityHeatmap, streakData] =
    await Promise.all([
      userProgressData,
      userSubscriptionData,
      profileStatsData,
      quizStatsData,
      activityHeatmapData,
      streakDataPromise,
    ]);

  if (!userProgress || !userProgress.activeCourse) redirect("/courses");

  const isPro = !!userSubscription?.isActive;

  return (
    <div className="flex flex-col-reverse gap-[48px] px-6 lg:flex-row-reverse lg:gap-[48px]">
      <StickyWrapper>
        <UserProgress
          activeCourse={userProgress.activeCourse}
          hearts={userProgress.hearts}
          points={userProgress.points}
          hasActiveSubscription={isPro}
          streak={streakData.currentStreak}
        />
        {!isPro && <Promo />}
      </StickyWrapper>

      <FeedWrapper>
        <div className="flex w-full flex-col items-center">
          {/* Profile header */}
          <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:items-start">
            <Avatar className="h-24 w-24 border-4 border-green-500 shadow-md">
              <AvatarImage src={userProgress.userImageSrc} className="object-cover" />
            </Avatar>

            <div className="flex flex-col items-center sm:items-start">
              <h1 className="text-2xl font-extrabold text-neutral-800 dark:text-foreground">
                {userProgress.userName}
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <Image
                  src={userProgress.activeCourse.imageSrc}
                  alt={userProgress.activeCourse.title}
                  width={24}
                  height={24}
                  className="rounded-sm border"
                />
                <span className="text-sm text-muted-foreground">
                  Learning {userProgress.activeCourse.title}
                </span>
              </div>
              {profileStats.memberSince && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Active since{" "}
                  {new Date(profileStats.memberSince + "T00:00:00Z").toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
              {isPro && (
                <span className="mt-2 inline-flex items-center rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-semibold text-indigo-600">
                  PRO
                </span>
              )}
            </div>
          </div>

          <Separator className="my-6 h-0.5 rounded-full" />

          {/* Streak cards */}
          <div className="w-full">
            <h2 className="mb-4 text-lg font-bold text-neutral-800 dark:text-foreground">Streak</h2>
            <StreakCard
              currentStreak={profileStats.currentStreak}
              longestStreak={profileStats.longestStreak}
              totalActiveDays={profileStats.totalActiveDays}
            />
          </div>

          <Separator className="my-6 h-0.5 rounded-full" />

          {/* Activity heatmap */}
          <div className="w-full">
            <h2 className="mb-4 text-lg font-bold text-neutral-800 dark:text-foreground">
              Activity
            </h2>
            <div className="rounded-xl border-2 bg-white p-4 shadow-sm dark:bg-slate-800/50">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {profileStats.totalActiveDays} active days in the past year
                </p>
              </div>
              <ActivityHeatmap
                activityData={activityHeatmap.map((row) => ({
                  date: row.date,
                  lessonsCompleted: row.lessonsCompleted,
                  quizzesCompleted: row.quizzesCompleted,
                  xpEarned: row.xpEarned,
                }))}
              />
            </div>
          </div>

          <Separator className="my-6 h-0.5 rounded-full" />

          {/* Stats overview */}
          <div className="w-full pb-6">
            <StatsOverview
              totalXp={profileStats.totalXp}
              totalLessonsCompleted={profileStats.totalLessonsCompleted}
              totalQuizzesCompleted={profileStats.totalQuizzesCompleted}
              averageQuizScore={quizStats.averageScore}
              improvementTrend={quizStats.improvementTrend}
              favouriteTopic={quizStats.favouriteTopic}
            />
          </div>
        </div>
      </FeedWrapper>
    </div>
  );
};

export default ProfilePage;
