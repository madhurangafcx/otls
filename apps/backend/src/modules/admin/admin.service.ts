import {
  adminRepository,
  type AdminStatsRow,
  type AdminStudentRow,
} from './admin.repository';

export const adminService = {
  async getStats(): Promise<AdminStatsRow> {
    return adminRepository.getStats();
  },

  async listStudents(): Promise<AdminStudentRow[]> {
    return adminRepository.listStudents();
  },
};
