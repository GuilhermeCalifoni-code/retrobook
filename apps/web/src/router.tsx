import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { AppLoader } from '@/components/feedback/AppLoader';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';

/*
 * Rotas pesadas entram por lazy loading: a landing e o login sao o primeiro
 * contato e nao devem carregar o app inteiro junto (secao 48).
 */
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const FeedPage = lazy(() => import('@/pages/FeedPage').then((m) => ({ default: m.FeedPage })));
const ExplorePage = lazy(() => import('@/pages/ExplorePage').then((m) => ({ default: m.ExplorePage })));
const BooksPage = lazy(() => import('@/pages/BooksPage').then((m) => ({ default: m.BooksPage })));
const BookDetailPage = lazy(() => import('@/pages/BookDetailPage').then((m) => ({ default: m.BookDetailPage })));
const LibraryPage = lazy(() => import('@/pages/LibraryPage').then((m) => ({ default: m.LibraryPage })));
const CommunitiesPage = lazy(() => import('@/pages/CommunitiesPage').then((m) => ({ default: m.CommunitiesPage })));
const CommunityPage = lazy(() => import('@/pages/CommunityPage').then((m) => ({ default: m.CommunityPage })));
const CreateCommunityPage = lazy(() =>
  import('@/pages/CreateCommunityPage').then((m) => ({ default: m.CreateCommunityPage })),
);
const PostDetailPage = lazy(() => import('@/pages/PostDetailPage').then((m) => ({ default: m.PostDetailPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const PeoplePage = lazy(() => import('@/pages/PeoplePage').then((m) => ({ default: m.PeoplePage })));
const NotificationsPage = lazy(() =>
  import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const MessagesPage = lazy(() => import('@/pages/MessagesPage').then((m) => ({ default: m.MessagesPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const UniversePage = lazy(() => import('@/pages/UniversePage').then((m) => ({ default: m.UniversePage })));
const ReadingStatsPage = lazy(() =>
  import('@/pages/ReadingStatsPage').then((m) => ({ default: m.ReadingStatsPage })),
);
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/PasswordPages').then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/PasswordPages').then((m) => ({ default: m.ResetPasswordPage })),
);
const VerifyEmailPage = lazy(() => import('@/pages/auth/PasswordPages').then((m) => ({ default: m.VerifyEmailPage })));

function LazyBoundary() {
  return (
    <Suspense fallback={<AppLoader />}>
      <Outlet />
    </Suspense>
  );
}

/**
 * URLs em portugues e legiveis (secao 49): /livro/duna, /c/clube-duna, /u/ana.reis.
 * Comunidades e perfis usam prefixo curto porque sao os links mais compartilhados.
 */
export const router = createBrowserRouter([
  {
    element: <LazyBoundary />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/entrar', element: <LoginPage /> },
      { path: '/criar-conta', element: <RegisterPage /> },
      { path: '/recuperar-senha', element: <ForgotPasswordPage /> },
      { path: '/nova-senha', element: <ResetPasswordPage /> },
      { path: '/confirmar-email', element: <VerifyEmailPage /> },
      { path: '/boas-vindas', element: <OnboardingPage /> },

      {
        element: <AppLayout />,
        children: [
          { path: '/inicio', element: <HomePage /> },
          { path: '/feed', element: <FeedPage /> },
          { path: '/explorar', element: <ExplorePage /> },
          { path: '/livros', element: <BooksPage /> },
          { path: '/livro/:slug', element: <BookDetailPage /> },
          { path: '/biblioteca', element: <LibraryPage /> },
          { path: '/minha-leitura', element: <ReadingStatsPage /> },
          { path: '/universo', element: <UniversePage /> },
          { path: '/comunidades', element: <CommunitiesPage /> },
          { path: '/comunidades/nova', element: <CreateCommunityPage /> },
          { path: '/c/:slug', element: <CommunityPage /> },
          { path: '/post/:id', element: <PostDetailPage /> },
          { path: '/pessoas', element: <PeoplePage /> },
          { path: '/perfil', element: <ProfilePage /> },
          { path: '/u/:username', element: <ProfilePage /> },
          { path: '/notificacoes', element: <NotificationsPage /> },
          { path: '/mensagens', element: <MessagesPage /> },
          { path: '/mensagens/:conversationId', element: <MessagesPage /> },
          { path: '/configuracoes', element: <SettingsPage /> },
        ],
      },

      // Atalhos antigos/estrangeiros continuam funcionando.
      { path: '/home', element: <Navigate to="/inicio" replace /> },
      { path: '/login', element: <Navigate to="/entrar" replace /> },
      { path: '/signup', element: <Navigate to="/criar-conta" replace /> },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
