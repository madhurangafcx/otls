import { adminRepository, type AdminStatsRow } from './admin.repository';

export const adminService = {
  async getStats(): Promise<AdminStatsRow> {
    return adminRepository.getStats();
  },
};
