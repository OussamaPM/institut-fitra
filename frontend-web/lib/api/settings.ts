import apiClient from './client';

export interface SettingItem {
  key: string;
  value: string | boolean | null;
  type: string;
  label: string;
  description: string;
  is_secret: boolean;
  is_set: boolean;
}

export interface SettingsGroups {
  maintenance: Record<string, SettingItem>;
  stripe: Record<string, SettingItem>;
  zoom: Record<string, SettingItem>;
}

export interface SettingUpdate {
  key: string;
  value: string | boolean | null;
}

export const settingsApi = {
  /**
   * Get all settings (admin only)
   */
  getAll: async (): Promise<SettingsGroups> => {
    const response = await apiClient.get<{ settings: SettingsGroups }>('/admin/settings');
    return response.data.settings;
  },

  /**
   * Update settings (admin only)
   */
  update: async (settings: SettingUpdate[]): Promise<{ message: string; updated: string[] }> => {
    const response = await apiClient.put<{ message: string; updated: string[] }>('/admin/settings', {
      settings,
    });
    return response.data;
  },

  /**
   * Get coming soon status (public)
   */
  getComingSoonStatus: async (): Promise<{ coming_soon: boolean }> => {
    const response = await apiClient.get<{ coming_soon_enabled: boolean }>('/settings/coming-soon');
    return { coming_soon: response.data.coming_soon_enabled };
  },
};

export default settingsApi;
