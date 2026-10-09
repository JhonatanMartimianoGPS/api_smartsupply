import { prisma } from "../lib/prisma.js";
import { notificationService } from "./notification.service.js";
import { AppError } from "../middlewares/error.middleware.js";

// Autor como vai na resposta (sem dados sensíveis)
const AUTHOR = { select: { id: true, name: true, role: true, department: true, avatarUrl: true } };

// Relações para montar os contadores e o "curti" do usuário atual
const POST_INCLUDE = {
  user: AUTHOR,
  likes: { select: { userId: true } },
  _count: { select: { comments: true, likes: true } },
};

export class FeedService {
  // Publicação: o modelo (com o autor em `user`) mais likes_count, comments_count e has_liked
  private formatPost(p: any, currentUserId?: string) {
    const { likes, _count, ...post } = p;
    return {
      ...post,
      likesCount: _count.likes,
      commentsCount: _count.comments,
      hasLiked: Boolean(currentUserId) && likes.some((l: any) => l.userId === currentUserId),
    };
  }

  async listPosts(currentUserId: string, params?: { page?: number; pageSize?: number }) {
    const page = Math.max(1, Number(params?.page) || 1);
    const pageSize = Math.max(1, Math.min(50, Number(params?.pageSize) || 10));
    const skip = (page - 1) * pageSize;

    const [total, posts] = await Promise.all([
      prisma.feedPost.count(),
      prisma.feedPost.findMany({
        skip,
        take: pageSize,
        include: POST_INCLUDE,
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      }),
    ]);

    return {
      items: posts.map((p) => this.formatPost(p, currentUserId)),
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
      include: POST_INCLUDE,
    });

    await notificationService.feedPostCreated({ postId: post.id, authorId: userId });

    return this.formatPost(post, userId);
  }

  async updatePost(id: string, userId: string, data: { title?: string; content?: string }) {
    const post = await prisma.feedPost.findUnique({ where: { id } });
    if (!post) throw new AppError(404, "Publicação não encontrada.");
    if (post.userId !== userId) throw new AppError(403, "Sem permissão para editar este post.");

    // Só título e texto podem mudar por aqui (fixar tem rota própria)
    const updated = await prisma.feedPost.update({
      where: { id },
      data: { title: data.title, content: data.content },
      include: POST_INCLUDE,
    });
    return this.formatPost(updated, userId);
  }

  async deletePost(id: string, userId: string, isAdmin = false) {
    const post = await prisma.feedPost.findUnique({ where: { id } });
    if (!post) throw new AppError(404, "Publicação não encontrada.");
    if (post.userId !== userId && !isAdmin) throw new AppError(403, "Sem permissão para excluir.");

    await prisma.feedPost.delete({ where: { id } });
    return { id };
  }

  async togglePin(id: string, currentUserId?: string) {
    const post = await prisma.feedPost.findUnique({ where: { id } });
    if (!post) throw new AppError(404, "Publicação não encontrada.");

    const updated = await prisma.feedPost.update({
      where: { id },
      data: { pinned: !post.pinned },
      include: POST_INCLUDE,
    });
    return this.formatPost(updated, currentUserId);
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
    return prisma.feedComment.findMany({
      where: { postId },
      include: { user: AUTHOR },
      orderBy: { createdAt: "asc" },
    });
  }

  async addComment(postId: string, userId: string, content: unknown) {
    if (typeof content !== "string" || !content.trim()) {
      throw new AppError(400, "O comentário não pode ficar vazio.");
    }
    return prisma.feedComment.create({
      data: { postId, userId, content: content.trim() },
      include: { user: AUTHOR },
    });
  }

  async deleteComment(commentId: string, userId: string, isAdmin = false) {
    const comment = await prisma.feedComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new AppError(404, "Comentário não encontrado.");
    if (comment.userId !== userId && !isAdmin) throw new AppError(403, "Sem permissão.");

    await prisma.feedComment.delete({ where: { id: commentId } });
    return { id: commentId };
  }
}

export const feedService = new FeedService();
