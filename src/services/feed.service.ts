import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error.middleware.js";

export class FeedService {
  async listPosts(currentUserId: string, params?: { page?: number; pageSize?: number }) {
    const page = Math.max(1, Number(params?.page) || 1);
    const pageSize = Math.max(1, Math.min(50, Number(params?.pageSize) || 10));
    const skip = (page - 1) * pageSize;

    const [total, posts] = await Promise.all([
      prisma.feedPost.count(),
      prisma.feedPost.findMany({
        skip,
        take: pageSize,
        include: {
          user: { select: { id: true, name: true, role: true, department: true, avatarUrl: true } },
          likes: { select: { userId: true } },
          _count: { select: { comments: true, likes: true } },
        },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      }),
    ]);

    const formatted = posts.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      image_url: p.imageUrl,
      pinned: p.pinned,
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
      author: p.user,
      likes_count: p._count.likes,
      comments_count: p._count.comments,
      has_liked: p.likes.some((l) => l.userId === currentUserId),
    }));

    return {
      posts: formatted,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async createPost(userId: string, data: { title: string; content: string; imageUrl?: string }) {
    const post = await prisma.feedPost.create({
      data: {
        userId,
        title: data.title,
        content: data.content,
        imageUrl: data.imageUrl,
      },
      include: {
        user: { select: { id: true, name: true, role: true, department: true, avatarUrl: true } },
      },
    });

    return {
      ...post,
      author: post.user,
      likes_count: 0,
      comments_count: 0,
      has_liked: false,
    };
  }

  async updatePost(id: string, userId: string, data: { title?: string; content?: string }) {
    const post = await prisma.feedPost.findUnique({ where: { id } });
    if (!post) throw new AppError(404, "Publicação não encontrada.");
    if (post.userId !== userId) throw new AppError(403, "Sem permissão para editar este post.");

    return prisma.feedPost.update({ where: { id }, data });
  }

  async deletePost(id: string, userId: string, isAdmin = false) {
    const post = await prisma.feedPost.findUnique({ where: { id } });
    if (!post) throw new AppError(404, "Publicação não encontrada.");
    if (post.userId !== userId && !isAdmin) throw new AppError(403, "Sem permissão para excluir.");

    await prisma.feedPost.delete({ where: { id } });
    return { id };
  }

  async togglePin(id: string) {
    const post = await prisma.feedPost.findUnique({ where: { id } });
    if (!post) throw new AppError(404, "Publicação não encontrada.");

    return prisma.feedPost.update({
      where: { id },
      data: { pinned: !post.pinned },
    });
  }

  async likePost(postId: string, userId: string) {
    await prisma.feedLike.upsert({
      where: { postId_userId: { postId, userId } },
      create: { postId, userId },
      update: {},
    });
    return { success: true };
  }

  async unlikePost(postId: string, userId: string) {
    await prisma.feedLike.deleteMany({
      where: { postId, userId },
    });
    return { success: true };
  }

  async listComments(postId: string) {
    const comments = await prisma.feedComment.findMany({
      where: { postId },
      include: {
        user: { select: { id: true, name: true, role: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return comments.map((c) => ({
      id: c.id,
      post_id: c.postId,
      content: c.content,
      created_at: c.createdAt.toISOString(),
      author: c.user,
    }));
  }

  async addComment(postId: string, userId: string, content: string) {
    const comment = await prisma.feedComment.create({
      data: { postId, userId, content },
      include: {
        user: { select: { id: true, name: true, role: true, avatarUrl: true } },
      },
    });

    return {
      id: comment.id,
      post_id: comment.postId,
      content: comment.content,
      created_at: comment.createdAt.toISOString(),
      author: comment.user,
    };
  }

  async deleteComment(commentId: string, userId: string, isAdmin = false) {
    const comment = await prisma.feedComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new AppError(404, "Comentário não encontrado.");
    if (comment.userId !== userId && !isAdmin) throw new AppError(403, "Sem permissão.");

    await prisma.feedComment.delete({ where: { id: commentId } });
    return { commentId };
  }
}

export const feedService = new FeedService();
