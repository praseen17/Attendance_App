import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AttendanceStatusIndicator } from '../AttendanceStatusIndicator';
import { attendanceStatusService } from '@/services/attendanceStatusService';

// Mock the attendance status service
jest.mock('@/services/attendanceStatusService', () => ({
    attendanceStatusService: {
        getCurrentStatus: jest.fn(),
        onStatusChange: jest.fn(),
        getStatusColor: jest.fn(),
        getStatusIcon: jest.fn(),
    },
}));

const mockAttendanceStatusService = attendanceStatusService as jest.Mocked<typeof attendanceStatusService>;

describe('AttendanceStatusIndicator', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default mock implementations
        mockAttendanceStatusService.getCurrentStatus.mockReturnValue({
            type: 'idle',
            message: 'Ready',
            timestamp: new Date(),
        });

        mockAttendanceStatusService.onStatusChange.mockReturnValue(() => { });
        mockAttendanceStatusService.getStatusColor.mockReturnValue('#6b7280');
        mockAttendanceStatusService.getStatusIcon.mockReturnValue('●');
    });

    it('renders compact variant correctly', () => {
        render(<AttendanceStatusIndicator variant="compact" />);

        expect(screen.getByText('Ready')).toBeTruthy();
        expect(mockAttendanceStatusService.getCurrentStatus).toHaveBeenCalled();
    });

    it('renders detailed variant correctly', () => {
        render(<AttendanceStatusIndicator variant="detailed" />);

        expect(screen.getByText('Ready')).toBeTruthy();
        expect(mockAttendanceStatusService.getCurrentStatus).toHaveBeenCalled();
    });

    it('renders banner variant correctly', () => {
        render(<AttendanceStatusIndicator variant="banner" />);

        expect(screen.getByText('Ready')).toBeTruthy();
        expect(mockAttendanceStatusService.getCurrentStatus).toHaveBeenCalled();
    });

    it('displays progress bar when progress is provided', () => {
        mockAttendanceStatusService.getCurrentStatus.mockReturnValue({
            type: 'capturing',
            message: 'Capturing...',
            timestamp: new Date(),
            progress: 50,
        });

        render(<AttendanceStatusIndicator variant="detailed" showProgress={true} />);

        expect(screen.getByText('Capturing...')).toBeTruthy();
        expect(screen.getByText('50%')).toBeTruthy();
    });

    it('subscribes to status changes on mount', () => {
        render(<AttendanceStatusIndicator />);

        expect(mockAttendanceStatusService.onStatusChange).toHaveBeenCalled();
    });

    it('shows activity indicator for processing states', () => {
        mockAttendanceStatusService.getCurrentStatus.mockReturnValue({
            type: 'processing',
            message: 'Processing...',
            timestamp: new Date(),
        });

        render(<AttendanceStatusIndicator variant="compact" />);

        expect(screen.getByText('Processing...')).toBeTruthy();
    });

    it('displays details when provided', () => {
        mockAttendanceStatusService.getCurrentStatus.mockReturnValue({
            type: 'success',
            message: 'Student recognized',
            details: 'Confidence: 95%',
            timestamp: new Date(),
        });

        render(<AttendanceStatusIndicator variant="detailed" />);

        expect(screen.getByText('Student recognized')).toBeTruthy();
        expect(screen.getByText('Confidence: 95%')).toBeTruthy();
    });
});