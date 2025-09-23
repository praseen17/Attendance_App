import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { renderIcon } from '@/constants/icons';
import { Colors } from '@/constants/theme';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

export default function DashboardScreen() {
  const router = useRouter();
  
  // Faculty-focused dashboard data
  const facultyStats = {
    totalClasses: 5,
    completedClasses: 3,
    pendingClasses: 2,
    totalSubjects: 4,
    weeklyHours: 18,
    monthlyClasses: 85,
    averageAttendance: 87.5
  };

  const facultyProfile = {
    name: 'Dr. John Smith',
    department: 'Computer Science',
    designation: 'Associate Professor',
    employeeId: 'FAC001',
    experience: '8 years',
    specialization: 'Data Structures & Algorithms'
  };

  const todaySchedule = [
    { id: 1, class: 'CS Year 1', subject: 'Programming Fundamentals', time: '09:00 AM', room: 'CS-101', status: 'completed', duration: '1.5 hrs' },
    { id: 2, class: 'CS Year 2', subject: 'Data Structures', time: '11:00 AM', room: 'CS-102', status: 'completed', duration: '2 hrs' },
    { id: 3, class: 'IT Year 1', subject: 'Web Development', time: '02:00 PM', room: 'IT-201', status: 'ongoing', duration: '1.5 hrs' },
    { id: 4, class: 'CS Year 3', subject: 'Database Systems', time: '03:30 PM', room: 'CS-103', status: 'upcoming', duration: '2 hrs' },
    { id: 5, class: 'IT Year 2', subject: 'Network Security', time: '04:30 PM', room: 'IT-202', status: 'upcoming', duration: '1 hr' },
  ];

  const recentActivity = [
    { id: 1, action: 'Attendance marked for CS Year 1 - Programming Fundamentals', time: '2 hours ago', type: 'attendance' },
    { id: 2, action: 'Class schedule updated for Database Systems', time: '4 hours ago', type: 'schedule' },
    { id: 3, action: 'Weekly attendance report generated', time: '1 day ago', type: 'report' },
    { id: 4, action: 'New assignment created for Data Structures', time: '2 days ago', type: 'assignment' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.backgroundSecondary }}>
      {/* Welcome Section */}
      <View style={{
        backgroundColor: Colors.light.surface,
        paddingHorizontal: isTablet ? 24 : 16,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ marginRight: 12 }}>
            {renderIcon('graduation', 28, Colors.light.primary)}
          </View>
          <Text style={{
            fontSize: isTablet ? 28 : 24,
            fontWeight: '700',
            color: Colors.light.text,
          }}>
            Faculty Dashboard
          </Text>
        </View>
        <Text style={{
          fontSize: isTablet ? 16 : 14,
          color: Colors.light.textSecondary,
          fontWeight: '500',
        }}>
          Welcome back, {facultyProfile.name} • {facultyProfile.designation}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: isTablet ? 24 : 16 }}>
          {/* Faculty Profile Card */}
          <View style={{
            backgroundColor: Colors.light.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
            borderLeftWidth: 4,
            borderLeftColor: Colors.light.primary,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ marginRight: 12 }}>
                {renderIcon('profile', 24, Colors.light.primary)}
              </View>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: Colors.light.text,
              }}>
                Faculty Profile
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
              <View style={{ flex: 1, minWidth: 150 }}>
                <Text style={{ fontSize: 12, color: Colors.light.textSecondary, marginBottom: 4 }}>Department</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.light.text }}>{facultyProfile.department}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 150 }}>
                <Text style={{ fontSize: 12, color: Colors.light.textSecondary, marginBottom: 4 }}>Employee ID</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.light.text }}>{facultyProfile.employeeId}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 150 }}>
                <Text style={{ fontSize: 12, color: Colors.light.textSecondary, marginBottom: 4 }}>Experience</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.light.text }}>{facultyProfile.experience}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Text style={{ fontSize: 12, color: Colors.light.textSecondary, marginBottom: 4 }}>Specialization</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.light.text }}>{facultyProfile.specialization}</Text>
              </View>
            </View>
          </View>

          {/* Faculty Stats */}
          <View style={{
            flexDirection: isTablet ? 'row' : 'column',
            gap: 16,
            marginBottom: 24,
          }}>
            <View style={{
              flex: 1,
              flexDirection: 'row',
              gap: 16,
            }}>
              <View style={{
                flex: 1,
                backgroundColor: Colors.light.surface,
                borderRadius: 16,
                padding: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 3,
                borderLeftWidth: 4,
                borderLeftColor: Colors.light.primary,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  {renderIcon('classes', 20, Colors.light.primary)}
                  <Text style={{
                    fontSize: 28,
                    fontWeight: '700',
                    color: Colors.light.primary,
                    marginLeft: 8,
                  }}>
                    {facultyStats.totalClasses}
                  </Text>
                </View>
                <Text style={{
                  fontSize: 14,
                  color: Colors.light.textSecondary,
                  fontWeight: '500',
                }}>
                  Today's Classes
                </Text>
              </View>

              <View style={{
                flex: 1,
                backgroundColor: Colors.light.surface,
                borderRadius: 16,
                padding: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 3,
                borderLeftWidth: 4,
                borderLeftColor: Colors.light.primaryLight,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  {renderIcon('book', 20, Colors.light.primaryLight)}
                  <Text style={{
                    fontSize: 28,
                    fontWeight: '700',
                    color: Colors.light.primaryLight,
                    marginLeft: 8,
                  }}>
                    {facultyStats.totalSubjects}
                  </Text>
                </View>
                <Text style={{
                  fontSize: 14,
                  color: Colors.light.textSecondary,
                  fontWeight: '500',
                }}>
                  Subjects Teaching
                </Text>
              </View>
            </View>

            <View style={{
              flex: 1,
              flexDirection: 'row',
              gap: 16,
            }}>
              <View style={{
                flex: 1,
                backgroundColor: Colors.light.surface,
                borderRadius: 16,
                padding: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 3,
                borderLeftWidth: 4,
                borderLeftColor: Colors.light.accent,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  {renderIcon('time', 20, Colors.light.accent)}
                  <Text style={{
                    fontSize: 28,
                    fontWeight: '700',
                    color: Colors.light.accent,
                    marginLeft: 8,
                  }}>
                    {facultyStats.weeklyHours}
                  </Text>
                </View>
                <Text style={{
                  fontSize: 14,
                  color: Colors.light.textSecondary,
                  fontWeight: '500',
                }}>
                  Weekly Hours
                </Text>
              </View>

              <View style={{
                flex: 1,
                backgroundColor: Colors.light.surface,
                borderRadius: 16,
                padding: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 3,
                borderLeftWidth: 4,
                borderLeftColor: Colors.light.primary,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  {renderIcon('attendance', 20, Colors.light.primary)}
                  <Text style={{
                    fontSize: 24,
                    fontWeight: '700',
                    color: Colors.light.primary,
                    marginLeft: 8,
                  }}>
                    {facultyStats.averageAttendance}%
                  </Text>
                </View>
                <Text style={{
                  fontSize: 14,
                  color: Colors.light.textSecondary,
                  fontWeight: '500',
                }}>
                  Avg Attendance
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={{
            backgroundColor: Colors.light.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ marginRight: 8 }}>
                {renderIcon('dashboard', 20, Colors.light.primary)}
              </View>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: Colors.light.text,
              }}>
                Quick Actions
              </Text>
            </View>

            <View style={{
              flexDirection: isTablet ? 'row' : 'column',
              gap: 12,
            }}>
              <TouchableOpacity
                onPress={() => router.push('/camera')}
                style={{
                  flex: 1,
                  backgroundColor: Colors.light.primary,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View style={{ marginRight: 8 }}>
                  {renderIcon('camera', 20, Colors.light.textOnPrimary)}
                </View>
                <Text style={{
                  color: Colors.light.textOnPrimary,
                  fontWeight: '600',
                  fontSize: 16,
                }}>
                  Camera Attendance
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/manual')}
                style={{
                  flex: 1,
                  backgroundColor: Colors.light.primaryLight,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View style={{ marginRight: 8 }}>
                  {renderIcon('manual', 20, Colors.light.textOnPrimary)}
                </View>
                <Text style={{
                  color: Colors.light.textOnPrimary,
                  fontWeight: '600',
                  fontSize: 16,
                }}>
                  Manual Entry
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/reports')}
                style={{
                  flex: 1,
                  backgroundColor: Colors.light.accent,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View style={{ marginRight: 8 }}>
                  {renderIcon('reports', 20, Colors.light.textOnPrimary)}
                </View>
                <Text style={{
                  color: Colors.light.textOnPrimary,
                  fontWeight: '600',
                  fontSize: 16,
                }}>
                  View Reports
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Today's Schedule */}
          <View style={{
            backgroundColor: Colors.light.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ marginRight: 8 }}>
                {renderIcon('calendar', 20, Colors.light.primary)}
              </View>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: Colors.light.text,
              }}>
                Today's Teaching Schedule
              </Text>
            </View>

            {todaySchedule.map((item) => (
              <View
                key={item.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  marginBottom: 8,
                  borderRadius: 12,
                  backgroundColor: Colors.light.backgroundSecondary,
                  borderWidth: 1,
                  borderColor: Colors.light.border,
                  borderLeftWidth: 4,
                  borderLeftColor: 
                    item.status === 'completed' ? Colors.light.primary :
                    item.status === 'ongoing' ? Colors.light.primaryLight : Colors.light.accent,
                }}
              >
                <View style={{ marginRight: 12 }}>
                  {item.status === 'completed' ? renderIcon('completed', 20, Colors.light.primary) :
                   item.status === 'ongoing' ? renderIcon('ongoing', 20, Colors.light.primaryLight) :
                   renderIcon('upcoming', 20, Colors.light.accent)}
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: Colors.light.text,
                    marginBottom: 4,
                  }}>
                    {item.subject}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: Colors.light.primary,
                    fontWeight: '500',
                    marginBottom: 2,
                  }}>
                    {item.class}
                  </Text>
                  <Text style={{
                    fontSize: 12,
                    color: Colors.light.textSecondary,
                    fontWeight: '500',
                  }}>
                    {item.time} • Room {item.room} • {item.duration}
                  </Text>
                </View>

                <View style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: 
                    item.status === 'completed' ? `${Colors.light.primary}20` :
                    item.status === 'ongoing' ? `${Colors.light.primaryLight}20` : `${Colors.light.accent}20`,
                }}>
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: 
                      item.status === 'completed' ? Colors.light.primary :
                      item.status === 'ongoing' ? Colors.light.primaryLight : Colors.light.accent,
                    textTransform: 'capitalize',
                  }}>
                    {item.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Recent Faculty Activity */}
          <View style={{
            backgroundColor: Colors.light.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 40,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ marginRight: 8 }}>
                {renderIcon('notification', 20, Colors.light.primary)}
              </View>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: Colors.light.text,
              }}>
                Recent Faculty Activity
              </Text>
            </View>

            {recentActivity.map((activity) => (
              <View
                key={activity.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.light.borderLight,
                }}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: `${Colors.light.primary}20`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}>
                  {activity.type === 'attendance' ? renderIcon('attendance', 18, Colors.light.primary) :
                   activity.type === 'schedule' ? renderIcon('calendar', 18, Colors.light.primary) :
                   activity.type === 'report' ? renderIcon('reports', 18, Colors.light.primary) :
                   renderIcon('document', 18, Colors.light.primary)}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: Colors.light.text,
                    marginBottom: 2,
                  }}>
                    {activity.action}
                  </Text>
                  <Text style={{
                    fontSize: 12,
                    color: Colors.light.textSecondary,
                    fontWeight: '500',
                  }}>
                    {activity.time}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 40,
    backgroundColor: '#6366f1',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 24,
    justifyContent: 'space-between',
    marginTop: -20,
  },
  statCard: {
    width: (width - 52) / 2,
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    padding: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statContent: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 6,
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  actionsContainer: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  sectionTitle: {
    marginBottom: 20,
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  actionButton: {
    marginBottom: 16,
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  activityContainer: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 32,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  activityCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  activityContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});
