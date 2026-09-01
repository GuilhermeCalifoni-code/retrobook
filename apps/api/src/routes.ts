import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes';
import { booksRouter } from './modules/books/books.routes';
import { communitiesRouter } from './modules/communities/communities.routes';
import { discoveryRouter } from './modules/discovery/discovery.routes';
import { universeRouter } from './modules/discovery/universe.routes';
import { libraryRouter } from './modules/library/library.routes';
import { messagesRouter } from './modules/messages/messages.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import { onboardingRouter } from './modules/onboarding/onboarding.routes';
import { commentsRouter, postsRouter } from './modules/posts/posts.routes';
import { reportsRouter } from './modules/reports/reports.routes';
import { settingsRouter } from './modules/settings/settings.routes';
import { statsRouter } from './modules/stats/stats.routes';
import { subscriptionsRouter } from './modules/subscriptions/subscriptions.routes';
import { usersRouter } from './modules/users/users.routes';

/** Mapa unico da API. Cada modulo expoe seu proprio router. */
export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ status: 'ok', service: 'retrobook-api' }));

apiRouter.use('/auth', authRouter);
apiRouter.use('/onboarding', onboardingRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/books', booksRouter);
apiRouter.use('/library', libraryRouter);
apiRouter.use('/communities', communitiesRouter);
apiRouter.use('/posts', postsRouter);
apiRouter.use('/comments', commentsRouter);
apiRouter.use('/discovery', discoveryRouter);
apiRouter.use('/discovery', universeRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/messages', messagesRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/stats', statsRouter);
apiRouter.use('/subscriptions', subscriptionsRouter);
apiRouter.use('/reports', reportsRouter);
