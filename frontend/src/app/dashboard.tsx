import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const API_BASE_URL = 'http://localhost:3085/api';

export default function HRAnalyticsDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [clusterLoading, setClusterLoading] = useState(false);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    avgSalary: 0,
  });
  const [clusters, setClusters] = useState<any[]>([]);

  useEffect(() => {
    // 📌 ตรวจสอบสิทธิ์ Admin แบบเงียบๆ ถ้าไม่ใช่ดีดกลับหน้าหลัก
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const role = localStorage.getItem('user_role');
        if (role !== 'admin') {
          router.replace('/');
          return;
        }
      }
    } catch (e) {
      console.log(e);
    }

    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    setClusterLoading(true);
    try {
      // ดึงข้อมูลพนักงานทั้งหมดเพื่อมาคำนวณสถิติเบื้องต้น
      const res = await fetch(`${API_BASE_URL}/employees`);
      const data = await res.json();
      
      if (Array.isArray(data) && data.length > 0) {
        const salaries = data.map((item: any) => Number(item.salary || 0));
        const totalSum = salaries.reduce((a, b) => a + b, 0);
        const avg = salaries.length > 0 ? totalSum / salaries.length : 0;

        setStats({
          totalEmployees: data.length,
          avgSalary: avg,
        });
      }

      // ดึงข้อมูล K-Means Salary Clusters จาก Backend (Phase 2)
      const clusterRes = await fetch(`${API_BASE_URL}/employees/salary-clusters`);
      const clusterData = await clusterRes.json();
      
      if (clusterData.success && Array.isArray(clusterData.clusters)) {
        setClusters(clusterData.clusters);
      }
    } catch (err) {
      console.log('Dashboard analytics fetch error:', err);
    } finally {
      setLoading(false);
      setClusterLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 HR SALARY ANALYTICS DASHBOARD</Text>
        <Text style={styles.headerSubtitle}>K-Means Salary Clustering (k=3) & Workforce Overview</Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={{ marginTop: 10, color: '#64748B' }}>กำลังประมวลผลข้อมูลโครงสร้างเงินเดือน...</Text>
        </View>
      ) : (
        <>
          {/* Summary Cards */}
          <View style={styles.cardRow}>
            <View style={[styles.summaryCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <Text style={styles.cardLabel}>พนักงานทั้งหมดในระบบ</Text>
              <Text style={[styles.cardValue, { color: '#1D4ED8' }]}>{stats.totalEmployees} คน</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
              <Text style={styles.cardLabel}>เงินเดือนเฉลี่ยภาพรวม</Text>
              <Text style={[styles.cardValue, { color: '#15803D' }]}>฿{stats.avgSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
            </View>
          </View>

          {/* K-Means Analytics Section (Phase 2) */}
          <View style={styles.analyticsBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={styles.sectionTitle}>🤖 K-Means Salary Tiers Breakdown (k=3)</Text>
              <TouchableOpacity style={styles.refreshBtn} onPress={fetchEmployeeData}>
                <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionDesc}>การจัดกลุ่มโครงสร้างเงินเดือนพนักงานออกเป็น 3 ระดับ (Tiers) ตามอัลกอริทึม K-Means</Text>

            {clusterLoading ? (
              <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 20 }} />
            ) : (
              <View style={styles.tierRow}>
                {clusters.map((cluster, idx) => {
                  const tierColors = [
                    { bg: '#DCFCE7', text: '#166534' }, // Tier 1
                    { bg: '#DBEAFE', text: '#1E40AF' }, // Tier 2
                    { bg: '#FFEDD5', text: '#C2410C' }, // Tier 3
                  ];
                  const colorConfig = tierColors[idx] || { bg: '#F1F5F9', text: '#475569' };

                  return (
                    <View key={idx} style={[styles.tierCard, { backgroundColor: colorConfig.bg }]}>
                      <Text style={[styles.tierTitle, { color: colorConfig.text }]}>{cluster.group}</Text>
                      <Text style={[styles.tierCount, { color: colorConfig.text }]}>{cluster.count} คน</Text>
                      <Text style={[styles.tierSub, { color: colorConfig.text }]}>Centroid: ฿{Number(cluster.centroid || 0).toLocaleString()}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </>
      )}

      {/* Navigation Back */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')}>
          <Text style={styles.backBtnText}>⬅️ กลับสู่หน้าจัดการพนักงาน (Dashboard)</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F8FAFC', padding: 16, alignItems: 'center' },
  header: { width: '100%', maxWidth: 600, backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  headerSubtitle: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  loaderContainer: { paddingVertical: 60, alignItems: 'center' },
  cardRow: { width: '100%', maxWidth: 600, flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cardLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 },
  cardValue: { fontSize: 20, fontWeight: '800' },
  analyticsBox: { width: '100%', maxWidth: 600, backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  sectionDesc: { fontSize: 11, color: '#64748B', marginBottom: 12 },
  refreshBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1' },
  refreshBtnText: { fontSize: 10, fontWeight: '700', color: '#334155' },
  tierRow: { flexDirection: 'row', gap: 8 },
  tierCard: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  tierTitle: { fontSize: 12, fontWeight: '800', marginBottom: 4 },
  tierCount: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  tierSub: { fontSize: 10, textAlign: 'center', fontWeight: '700' },
  buttonContainer: { width: '100%', maxWidth: 600, marginTop: 4, marginBottom: 20 },
  backBtn: { backgroundColor: '#0F172A', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  backBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});