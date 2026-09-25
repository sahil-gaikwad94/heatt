'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { ChatView } from '@/components/chat/ChatView';
import { TopBar } from '@/components/shell/Shell';

export default function MessagesPage() {
  return (
    <>
      <TopBar title="Messages" sub="Direct conversations on heatt" />
      <div className="mx-auto w-full max-w-[1200px] px-3 pt-3 sm:px-6 sm:pt-4 pb-28">
        <h1 className="sr-only">Messages</h1>
        <Suspense fallback={<div className="h-96 w-full animate-pulse rounded-2xl bg-surface/50" />}>
          <ChatView />
        </Suspense>
      </div>
    </>
  );
}
