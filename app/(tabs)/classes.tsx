import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

interface ClassInfo {
  id: string;
  name: string;
  subject: string;
  students: number;
  schedule: string;
  room: string;
  semester: string;
}

export default function ClassesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('All');
  
  const [classes] = useState<ClassInfo[]>([
    {
      id: '1',
      name: 'Computer Science - Year 1',
      subject: 'Programming Fundamentals',
      students: 45,
      schedule: 'Mon, Wed, Fri - 9:00 AM',
      room: 'CS-101',
      semester: 'Fall 2024',
    },
    {
      id: '2',
      name: 'Computer Science - Year 2',
      subject: 'Data Structures',
      students: 38,
      schedule: 'Tue, Thu - 10:30 AM',
      room: 'CS-102',
      semester: 'Fall 2024',
    },
    {
      id: '3',
      name: 'Computer Science - Year 3',
      subject: 'Database Systems',
      students: 42,
      schedule: 'Mon, Wed - 2:00 PM',
      room: 'CS-103',
      semester: 'Fall 2024',
    },
    {
      id: '4',
      name: 'Information Technology - Year 1',
      subject: 'Web Development',
      students: 35,
      schedule: 'Tue, Thu, Fri - 11:00 AM',
      room: 'IT-201',
      semester: 'Fall 2024',
    },
    {
      id: '5',
      name: 'Information Technology - Year 2',
      subject: 'Network Security',
      students: 29,
      schedule: 'Mon, Wed - 3:30 PM',
      room: 'IT-202',
      semester: 'Fall 2024',
    },
  ]);

  const semesters = ['All', 'Fall 2024', 'Spring 2024', 'Summer 2024'];

  const filteredClasses = classes.filter(classItem => {
    const matchesSearch = classItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         classItem.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSemester = selectedSemester === 'All' || classItem.semester === selectedSemester;
    return matchesSearch && matchesSemester;
  });

  const handleClassPress = (classItem: ClassInfo) => {
    Alert.alert(
      classItem.name,
      `Subject: ${classItem.subject}\nStudents: ${classItem.students}\nSchedule: ${classItem.schedule}\nRoom: ${classItem.room}\nSemester: ${classItem.semester}`,
      [
        { text: 'View Students', onPress: () => {} },
        { text: 'Take Attendance', onPress: () => {} },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const totalStudents = classes.reduce((sum, classItem) => sum + classItem.students, 0);
  const totalClasses = classes.length;

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#ffffff',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 24,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
      }}>
        <Text style={{
          fontSize: 28,
          fontWeight: '700',
          color: '#1f2937',
          marginBottom: 8,
        }}>
          My Classes
        </Text>
        <Text style={{
          fontSize: 16,
          color: '#6b7280',
          fontWeight: '500',
        }}>
          Manage your classes and schedules
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 24 }}>
          {/* Stats Cards */}
          <View style={{
            flexDirection: isTablet ? 'row' : 'column',
            gap: 16,
            marginBottom: 24,
          }}>
            <View style={{
              flex: 1,
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 3,
              borderLeftWidth: 4,
              borderLeftColor: '#3b82f6',
            }}>
              <Text style={{
                fontSize: 32,
                fontWeight: '700',
                color: '#3b82f6',
                marginBottom: 4,
              }}>
                {totalClasses}
              </Text>
              <Text style={{
                fontSize: 16,
                color: '#6b7280',
                fontWeight: '500',
              }}>
                Total Classes
              </Text>
            </View>

            <View style={{
              flex: 1,
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 3,
              borderLeftWidth: 4,
              borderLeftColor: '#10b981',
            }}>
              <Text style={{
                fontSize: 32,
                fontWeight: '700',
                color: '#10b981',
                marginBottom: 4,
              }}>
                {totalStudents}
              </Text>
              <Text style={{
                fontSize: 16,
                color: '#6b7280',
                fontWeight: '500',
              }}>
                Total Students
              </Text>
            </View>
          </View>

          {/* Search and Filter */}
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: 16,
            }}>
              Search & Filter
            </Text>

            <View style={{
              flexDirection: isTablet ? 'row' : 'column',
              gap: 16,
            }}>
              <View style={{ flex: 1 }}>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search classes or subjects..."
                  style={{
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    backgroundColor: '#f9fafb',
                  }}
                />
              </View>

              <View style={{ flex: isTablet ? 0.6 : 1 }}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                >
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {semesters.map((semester) => (
                      <TouchableOpacity
                        key={semester}
                        onPress={() => setSelectedSemester(semester)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 8,
                          backgroundColor: selectedSemester === semester ? '#3b82f6' : '#f3f4f6',
                          borderWidth: 1,
                          borderColor: selectedSemester === semester ? '#3b82f6' : '#e5e7eb',
                        }}
                      >
                        <Text style={{
                          fontSize: 14,
                          fontWeight: '500',
                          color: selectedSemester === semester ? '#ffffff' : '#374151',
                        }}>
                          {semester}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
          </View>

          {/* Classes List */}
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 20,
            marginBottom: 40,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: 16,
            }}>
              Classes ({filteredClasses.length})
            </Text>

            {filteredClasses.map((classItem) => (
              <TouchableOpacity
                key={classItem.id}
                onPress={() => handleClassPress(classItem)}
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                }}
              >
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 8,
                }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 18,
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: 4,
                    }}>
                      {classItem.name}
                    </Text>
                    <Text style={{
                      fontSize: 16,
                      color: '#3b82f6',
                      fontWeight: '500',
                      marginBottom: 8,
                    }}>
                      {classItem.subject}
                    </Text>
                  </View>
                  
                  <View style={{
                    backgroundColor: '#3b82f6',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                  }}>
                    <Text style={{
                      color: '#ffffff',
                      fontSize: 14,
                      fontWeight: '600',
                    }}>
                      {classItem.students} students
                    </Text>
                  </View>
                </View>

                <View style={{
                  flexDirection: isTablet ? 'row' : 'column',
                  gap: isTablet ? 24 : 8,
                }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    flex: 1,
                  }}>
                    <Text style={{ fontSize: 16, marginRight: 4 }}>🕒</Text>
                    <Text style={{
                      fontSize: 14,
                      color: '#6b7280',
                      fontWeight: '500',
                    }}>
                      {classItem.schedule}
                    </Text>
                  </View>

                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    flex: 1,
                  }}>
                    <Text style={{ fontSize: 16, marginRight: 4 }}>🏫</Text>
                    <Text style={{
                      fontSize: 14,
                      color: '#6b7280',
                      fontWeight: '500',
                    }}>
                      Room {classItem.room}
                    </Text>
                  </View>

                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    flex: 1,
                  }}>
                    <Text style={{ fontSize: 16, marginRight: 4 }}>📅</Text>
                    <Text style={{
                      fontSize: 14,
                      color: '#6b7280',
                      fontWeight: '500',
                    }}>
                      {classItem.semester}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {filteredClasses.length === 0 && (
              <View style={{
                alignItems: 'center',
                paddingVertical: 40,
              }}>
                <Text style={{
                  fontSize: 48,
                  marginBottom: 16,
                }}>
                  📚
                </Text>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: 8,
                }}>
                  No classes found
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: '#9ca3af',
                  textAlign: 'center',
                }}>
                  Try adjusting your search or filter criteria
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}