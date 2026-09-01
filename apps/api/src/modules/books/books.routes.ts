import { Router } from 'express';
import { asyncHandler } from '../../common/http';
import { optionalAuth } from '../../middlewares/auth.middleware';
import * as controller from './books.controller';

export const booksRouter = Router();

booksRouter.get('/', optionalAuth, asyncHandler(controller.list));
booksRouter.get('/search', optionalAuth, asyncHandler(controller.search));
booksRouter.get('/genres', asyncHandler(controller.genres));
booksRouter.get('/:slug', optionalAuth, asyncHandler(controller.detail));
booksRouter.get('/:slug/readers', optionalAuth, asyncHandler(controller.readers));
booksRouter.get('/:slug/discussions', optionalAuth, asyncHandler(controller.discussions));
