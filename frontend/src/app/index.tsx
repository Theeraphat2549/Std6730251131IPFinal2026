import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Employee {
  id: string;
  name: string;
  position: string;
  status: 'Active' | 'On Leave';
  salary: number;
  salaryTier?: string;
}

const API_BASE_URL = 'http://localhost:3085/api';

// 1D K-Means Clustering for salary (k=3)
const clusterSalariesLocally = (data: Employee[]) => {
  if (!data || data.length === 0) return [];
  const salaries = data.map(item => Number(item.salary || 0));

  let centroids = [
    Math.min(...salaries),
    (Math.min(...salaries) + Math.max(...salaries)) / 2,
    Math.max(...salaries)
  ];

  let assignments: number[] = [];
  let changed = true;

  while (changed) {
    changed = false;
    assignments = salaries.map(salary => {
      const diffs = centroids.map(c => Math.abs(salary - c));
      return diffs.indexOf(Math.min(...diffs));
    });

    const newCentroids = [0, 1, 2].map(i => {
      const clusterSal = salaries.filter((_, index) => assignments[index] === i);
      return clusterSal.length
        ? clusterSal.reduce((a, b) => a + b, 0) / clusterSal.length
        : centroids[i];
    });

    if (JSON.stringify(centroids) !== JSON.stringify(newCentroids)) {
      centroids = newCentroids;
      changed = true;
    }
  }

  const sortedCentroids = [...centroids].sort((a, b) => a - b);
  const labels = ["Tier 1", "Tier 2", "Tier 3"];

  return data.map((item, index) => {
    const myCentroid = centroids[assignments[index]];
    const tierIndex = sortedCentroids.indexOf(myCentroid);
    return { ...item, salaryTier: labels[tierIndex] || "Tier 2" };
  });
};

export default function HRDashboardScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState('');

  // Cluster Analytics Summary State
  const [clusterSummary, setClusterSummary] = useState<any[]>([]);
  const [clusterLoading, setClusterLoading] = useState(false);

  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/employees`);
      const data = await response.json();
      if (Array.isArray(data)) {
        const formatted: Employee[] = data.map((item: any) => ({
          id: String(item.id || item._id || Date.now()),
          name: item.name || 'Unknown',
          position: item.position || 'Staff',
          status: item.status || 'Active',
          salary: Number(item.salary || 0),
        }));
        const clustered = clusterSalariesLocally(formatted);
        setEmployees(clustered);
      }
    } catch (err) {
      console.log('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        setIsAdmin(true); 
      }
    } catch (e) {
      console.log(e);
    }

    fetchEmployees();
  }, []);

  // Handle Add Employee with Client-side Validation (Status 400 requirement check)
  const handleSaveEmployee = async () => {
    if (!name.trim() || !position.trim() || !salary.trim()) {
      Alert.alert('Validation Error', 'Please fill in all required fields (Name, Position, Salary).');
      return;
    }

    const salaryNum = parseFloat(salary);
    if (isNaN(salaryNum)) {
      Alert.alert('Validation Error', 'Salary must be a numeric value.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          position: position.trim(),
          salary: salaryNum,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        Alert.alert('Error', result.message || 'Bad Request: Failed to add employee.');
        return;
      }

      setIsModalOpen(false);
      setName('');
      setPosition('');
      setSalary('');
      showToast('Employee added successfully! ✅');
      await fetchEmployees();
    } catch (err) {
      console.log('Save error:', err);
      Alert.alert('Error', 'Network or server error occurred.');
    }
  };

  // Toggle Status (Active <-> On Leave)
  const handleToggleStatus = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${id}/status`, {
        method: 'PUT',
      });
      if (response.ok) {
        await fetchEmployees();
        showToast('Status updated successfully!');
      }
    } catch (err) {
      console.log('Toggle error:', err);
    }
  };

  // Delete with Confirmation (Compatible with both Web and Mobile)
  const handleDeleteEmployee = async (id: string, empName: string) => {
    const isConfirmed = Platform.OS === 'web' 
      ? window.confirm(`Do you want to remove "${empName}" from the system?`) 
      : await new Promise((resolve) => {
          Alert.alert(
            'Are you sure?',
            `Do you want to remove "${empName}" from the system?`,
            [
              { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
              { text: 'Delete', onPress: () => resolve(true), style: 'destructive' },
            ]
          );
        });

    if (!isConfirmed) return;

    try {
      const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchEmployees();
        showToast('Employee deleted successfully.');
      }
    } catch (err) {
      console.log('Delete error:', err);
    }
  };

  // Phase 2: K-Means Salary Clustering Analytics Trigger
  const handleAnalyzeClusters = async () => {
    setClusterLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/employees/salary-clusters`);
      const data = await response.json();
      if (data.success && data.clusters) {
        setClusterSummary(data.clusters);
        showToast('Salary analytics computed successfully!');
      } else {
        computeLocalClusters();
      }
    } catch (err) {
      console.log('Cluster API error, computing locally:', err);
      computeLocalClusters();
    } finally {
      setClusterLoading(false);
    }
  };

  const computeLocalClusters = () => {
    if (employees.length === 0) return;
    const tiers = ['Tier 1', 'Tier 2', 'Tier 3'];
    const summary = tiers.map(tier => {
      const groupItems = employees.filter(e => e.salaryTier === tier);
      const count = groupItems.length;
      const avgSalary = count > 0 ? groupItems.reduce((sum, e) => sum + e.salary, 0) / count : 0;
      return { group: tier, centroid: Math.round(avgSalary), count };
    });
    setClusterSummary(summary);
  };

  const getTierBadgeStyle = (tier?: string) => {
    switch (tier) {
      case 'Tier 1':
        return { backgroundColor: '#DCFCE7', color: '#166534', borderColor: '#BBF7D0' };
      case 'Tier 2':
        return { backgroundColor: '#DBEAFE', color: '#1E40AF', borderColor: '#BFDBFE' };
      case 'Tier 3':
        return { backgroundColor: '#FFEDD5', color: '#C2410C', borderColor: '#FED7AA' };
      default:
        return { backgroundColor: '#F1F5F9', color: '#475569', borderColor: '#E2E8F0' };
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandTitle} numberOfLines={1}>HR Manager & Salary Analytics</Text>
            <Text style={styles.brandSubtitle} numberOfLines={1}>Admin Mode (Full CRUD Access)</Text>
          </View>
          <TouchableOpacity 
            style={styles.logoutBtn} 
            activeOpacity={0.8} 
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Toast Notification */}
      {toastMessage !== '' && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Phase 2: Analytics Section */}
        <View style={styles.analyticsCard}>
          <View style={styles.analyticsHeaderRow}>
            <Text style={styles.analyticsCardTitle}>📊 Salary Structure Analytics (K-Means)</Text>
            <TouchableOpacity 
              style={styles.analyzeBtn} 
              activeOpacity={0.8} 
              onPress={handleAnalyzeClusters}
            >
              <Text style={styles.analyzeBtnText}>Run Analysis</Text>
            </TouchableOpacity>
          </View>

          {clusterLoading ? (
            <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 12 }} />
          ) : clusterSummary.length > 0 ? (
            <View style={styles.clusterSummaryGrid}>
              {clusterSummary.map((cluster, index) => (
                <View key={index} style={styles.clusterSummaryBox}>
                  <Text style={styles.clusterGroupTitle}>{cluster.group}</Text>
                  <Text style={styles.clusterCentroid}>฿{cluster.centroid?.toLocaleString()}</Text>
                  <Text style={styles.clusterCount}>Count: {cluster.count} staff</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.analyticsPlaceholder}>Click "Run Analysis" to cluster salaries into 3 tiers.</Text>
          )}
        </View>

        {/* Employee Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Employee Directory ({employees.length})</Text>
          <TouchableOpacity 
            style={styles.addEmpBtn} 
            activeOpacity={0.8} 
            onPress={() => {
              setName('');
              setPosition('');
              setSalary('');
              setIsModalOpen(true);
            }}
          >
            <Text style={styles.addEmpBtnText}>+ Add Employee</Text>
          </TouchableOpacity>
        </View>

        {/* Employee List */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#0F172A" />
          </View>
        ) : employees.length === 0 ? (
          <Text style={styles.emptyText}>No employee records found.</Text>
        ) : (
          employees.map((item) => {
            const badgeStyle = getTierBadgeStyle(item.salaryTier);
            const isActive = item.status === 'Active';
            return (
              <View key={item.id} style={styles.empCard}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <Text numberOfLines={1} style={styles.empName}>{item.name}</Text>
                    {item.salaryTier && (
                      <View style={[styles.tierBadge, { backgroundColor: badgeStyle.backgroundColor, borderColor: badgeStyle.borderColor }]}>
                        <Text style={[styles.tierText, { color: badgeStyle.color }]}>{item.salaryTier}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.empPosition} numberOfLines={1}>{item.position}</Text>
                  <View style={styles.empInfoRow}>
                    <Text style={styles.empSalary}>฿{Number(item.salary).toLocaleString()}</Text>
                    <Text style={[styles.empStatusText, { color: isActive ? '#166534' : '#C2410C' }]}>
                      ● {item.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.empActions}>
                  <TouchableOpacity 
                    style={styles.toggleBtn} 
                    activeOpacity={0.7} 
                    onPress={() => handleToggleStatus(item.id)}
                  >
                    <Text style={styles.toggleText}>Toggle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteBtn} 
                    activeOpacity={0.7} 
                    onPress={() => handleDeleteEmployee(item.id, item.name)}
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Employee Modal */}
      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add New Employee</Text>
            
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. John Doe" 
              placeholderTextColor="#94A3B8" 
              value={name} 
              onChangeText={setName} 
            />
            
            <Text style={styles.inputLabel}>Position</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. Software Engineer" 
              placeholderTextColor="#94A3B8" 
              value={position} 
              onChangeText={setPosition} 
            />
            
            <Text style={styles.inputLabel}>Salary (THB)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. 45000" 
              placeholderTextColor="#94A3B8" 
              keyboardType="numeric" 
              value={salary} 
              onChangeText={setSalary} 
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveEmployee} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save Employee</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerWrapper: { width: '100%', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', alignItems: 'center' },
  header: { width: '100%', maxWidth: 800, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  brandTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  brandSubtitle: { fontSize: 11, color: '#64748B', marginTop: 1 },
  logoutBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  logoutBtnText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  
  scrollContent: { padding: 16, paddingBottom: 40, width: '100%', maxWidth: 800, alignSelf: 'center' },
  
  analyticsCard: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, marginBottom: 20, shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  analyticsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  analyticsCardTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  analyzeBtn: { backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  analyzeBtnText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  analyticsPlaceholder: { fontSize: 12, color: '#64748B', fontStyle: 'italic', textAlign: 'center', marginVertical: 8 },
  
  clusterSummaryGrid: { flexDirection: 'row', gap: 8, marginTop: 4 },
  clusterSummaryBox: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', padding: 10, alignItems: 'center' },
  clusterGroupTitle: { fontSize: 12, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  clusterCentroid: { fontSize: 13, fontWeight: '800', color: '#2563EB', marginVertical: 2 },
  clusterCount: { fontSize: 10, color: '#64748B', fontWeight: '600' },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  addEmpBtn: { backgroundColor: '#0F172A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  addEmpBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  loaderContainer: { paddingVertical: 40, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#64748B', fontSize: 13, marginVertical: 20 },

  empCard: { backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#64748B', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  empName: { fontSize: 14, fontWeight: '700', color: '#0F172A', flexShrink: 1 },
  empPosition: { fontSize: 12, color: '#64748B', marginBottom: 6 },
  empInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  empSalary: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  empStatusText: { fontSize: 11, fontWeight: '700' },

  tierBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, borderWidth: 1 },
  tierText: { fontSize: 9, fontWeight: '700' },

  empActions: { flexDirection: 'row', gap: 6 },
  toggleBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1' },
  toggleText: { fontSize: 11, fontWeight: '600', color: '#334155' },
  deleteBtn: { backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#FCA5A5' },
  deleteText: { fontSize: 11, fontWeight: '600', color: '#DC2626' },

  toastContainer: { position: 'absolute', top: 70, alignSelf: 'center', backgroundColor: '#0F172A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 6, zIndex: 999 },
  toastText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#0F172A', marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' },
  cancelBtnText: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  saveBtn: { backgroundColor: '#0F172A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
});