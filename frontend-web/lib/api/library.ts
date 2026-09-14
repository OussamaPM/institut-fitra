import apiClient from './client';
import {
  LibraryAccessOption,
  LibraryCategory,
  LibraryFolder,
  LibraryItem,
  LibraryStatus,
  PaginatedResponse,
  SaveLibraryFolderData,
  SaveLibraryItemData,
} from '@/lib/types';

/** Aligné sur LibraryItemController::PER_PAGE, mais la réponse fait toujours foi. */
export const LIBRARY_ITEMS_PER_PAGE = 10;

export const libraryApi = {
  /**
   * Dossiers d'une catégorie (avec nombre d'items et règles d'accès)
   */
  getFolders: async (category: LibraryCategory, search?: string): Promise<LibraryFolder[]> => {
    const response = await apiClient.get<{ folders: LibraryFolder[] }>('/admin/library/folders', {
      params: { category, search: search || undefined },
    });
    return response.data.folders;
  },

  /**
   * Classes et niveaux activés, pour le ciblage d'accès
   */
  getAccessOptions: async (): Promise<LibraryAccessOption[]> => {
    const response = await apiClient.get<{ options: LibraryAccessOption[] }>('/admin/library/access-options');
    return response.data.options;
  },

  createFolder: async (data: SaveLibraryFolderData): Promise<LibraryFolder> => {
    const response = await apiClient.post<{ folder: LibraryFolder }>('/admin/library/folders', data);
    return response.data.folder;
  },

  updateFolder: async (id: number, data: SaveLibraryFolderData): Promise<LibraryFolder> => {
    // La catégorie est figée après création : l'envoyer renverrait une 422
    const payload: Omit<SaveLibraryFolderData, 'category'> = {
      title: data.title,
      is_public: data.is_public,
      ...(data.accesses ? { accesses: data.accesses } : {}),
    };
    const response = await apiClient.put<{ folder: LibraryFolder }>(`/admin/library/folders/${id}`, payload);
    return response.data.folder;
  },

  /**
   * Publication / retour en brouillon — route dédiée, le statut est ignoré ailleurs
   */
  setFolderStatus: async (id: number, status: LibraryStatus): Promise<LibraryFolder> => {
    const response = await apiClient.post<{ folder: LibraryFolder }>(
      `/admin/library/folders/${id}/status`,
      { status },
    );
    return response.data.folder;
  },

  deleteFolder: async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/library/folders/${id}`);
  },

  getItems: async (
    folderId: number,
    page = 1,
  ): Promise<{ items: PaginatedResponse<LibraryItem>; folder: LibraryFolder }> => {
    const response = await apiClient.get<{ items: PaginatedResponse<LibraryItem>; folder: LibraryFolder }>(
      `/admin/library/folders/${folderId}/items`,
      { params: { page } },
    );
    return response.data;
  },

  /**
   * Ajout d'un contenu : multipart si un fichier est joint, JSON sinon
   */
  createItem: async (folderId: number, data: SaveLibraryItemData): Promise<LibraryItem> => {
    if (data.file) {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('file', data.file);

      const response = await apiClient.post<{ item: LibraryItem }>(
        `/admin/library/folders/${folderId}/items`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data.item;
    }

    const response = await apiClient.post<{ item: LibraryItem }>(
      `/admin/library/folders/${folderId}/items`,
      { title: data.title, type: data.type, embed_url: data.embed_url },
    );
    return response.data.item;
  },

  /**
   * Édition : le lien n'est envoyé que s'il change, le fichier ne se remplace pas
   */
  updateItem: async (id: number, data: { title: string; type?: 'video' | 'audio'; embed_url?: string }): Promise<LibraryItem> => {
    const response = await apiClient.put<{ item: LibraryItem }>(`/admin/library/items/${id}`, data);
    return response.data.item;
  },

  deleteItem: async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/library/items/${id}`);
  },

  /**
   * Monte ou descend un contenu d'un cran — l'API renvoie la page réordonnée
   */
  moveItem: async (
    id: number,
    direction: 'up' | 'down',
    page = 1,
  ): Promise<{ moved: boolean; item: LibraryItem; items: PaginatedResponse<LibraryItem> }> => {
    const response = await apiClient.post<{
      moved: boolean;
      item: LibraryItem;
      items: PaginatedResponse<LibraryItem>;
    }>(`/admin/library/items/${id}/move`, { direction, page });
    return response.data;
  },

  /**
   * Côté élève : dossiers visibles (publiés, et autorisés pour sa classe/son niveau)
   */
  getStudentFolders: async (category: LibraryCategory): Promise<LibraryFolder[]> => {
    const response = await apiClient.get<{ folders: LibraryFolder[] }>('/student/library/folders', {
      params: { category },
    });
    return response.data.folders;
  },

  /**
   * Côté élève : contenus d'un dossier — 404 si le dossier ne lui est pas destiné
   */
  getStudentItems: async (
    folderId: number,
    page = 1,
  ): Promise<{ items: PaginatedResponse<LibraryItem>; folder: Pick<LibraryFolder, 'id' | 'category' | 'title'> }> => {
    const response = await apiClient.get<{
      items: PaginatedResponse<LibraryItem>;
      folder: Pick<LibraryFolder, 'id' | 'category' | 'title'>;
    }>(`/student/library/folders/${folderId}/items`, { params: { page } });
    return response.data;
  },

  /**
   * URL signée d'un document.
   *
   * Un <a href> n'enverrait pas l'en-tête Authorization : on demande donc le lien
   * à l'API, puis on navigue dessus. Le lien expire au bout de 5 minutes.
   */
  getDownloadUrl: async (id: number): Promise<string> => {
    const response = await apiClient.get<{ url: string }>(`/library/items/${id}/download`);
    return response.data.url;
  },
};

export default libraryApi;
