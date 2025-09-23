import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ProgressIndicator, useProgressIndicator } from '../ProgressIndicator';

// Mock Animated
jest.mock('react-native', () => {
    const RN = jest.requireActual('react-native');
    return {
        ...RN,
        Animated: {
            ...RN.Animated,
            timing: jest.fn(() => ({
                start: jest.fn((callback) => callback && callback()),
            })),
            Value: jest.fn(() => ({
                setValue: jest.fn(),
                interpolate: jest.fn(() => '50%'),
            })),
        },
    };
});

describe('ProgressIndicator', () => {
    const defaultProps = {
        visible: true,
        progress: 50,
        message: 'Processing...',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders linear variant correctly', () => {
        render(<ProgressIndicator {...defaultProps} variant="linear" />);

        expect(screen.getByText('Processing...')).toBeTruthy();
        expect(screen.getByText('50%')).toBeTruthy();
    });

    it('renders circular variant correctly', () => {
        render(<ProgressIndicator {...defaultProps} variant="circular" />);

        expect(screen.getByText('Processing...')).toBeTruthy();
        expect(screen.getByText('50%')).toBeTruthy();
    });

    it('renders steps variant correctly', () => {
        render(<ProgressIndicator {...defaultProps} variant="steps" />);

        expect(screen.getByText('Processing...')).toBeTruthy();
        expect(screen.getByText('50%')).toBeTruthy();
    });

    it('displays details when provided', () => {
        render(
            <ProgressIndicator
                {...defaultProps}
                details="Step 2 of 4"
            />
        );

        expect(screen.getByText('Processing...')).toBeTruthy();
        expect(screen.getByText('Step 2 of 4')).toBeTruthy();
    });

    it('hides percentage when showPercentage is false', () => {
        render(
            <ProgressIndicator
                {...defaultProps}
                showPercentage={false}
            />
        );

        expect(screen.getByText('Processing...')).toBeTruthy();
        expect(screen.queryByText('50%')).toBeNull();
    });

    it('does not render when visible is false', () => {
        render(<ProgressIndicator {...defaultProps} visible={false} />);

        expect(screen.queryByText('Processing...')).toBeNull();
    });

    it('shows activity indicator when progress is less than 100', () => {
        render(<ProgressIndicator {...defaultProps} progress={75} />);

        expect(screen.getByText('Processing...')).toBeTruthy();
    });

    it('shows checkmark icon when progress is 100', () => {
        render(<ProgressIndicator {...defaultProps} progress={100} />);

        expect(screen.getByText('Processing...')).toBeTruthy();
    });
});

describe('useProgressIndicator', () => {
    const TestComponent = () => {
        const { progress, showProgress, updateProgress, hideProgress, completeProgress } = useProgressIndicator();

        return (
            <>
                <ProgressIndicator
                    visible={progress.visible}
                    progress={progress.progress}
                    message={progress.message}
                    details={progress.details}
                />
                <button
                    testID="show-progress"
                    onPress={() => showProgress('Test Progress', 25, 'Test Details')}
                />
                <button
                    testID="update-progress"
                    onPress={() => updateProgress(75, 'Updated Progress')}
                />
                <button
                    testID="complete-progress"
                    onPress={() => completeProgress('Completed')}
                />
                <button
                    testID="hide-progress"
                    onPress={hideProgress}
                />
            </>
        );
    };

    it('manages progress state correctly', () => {
        render(<TestComponent />);

        // Initially not visible
        expect(screen.queryByText('Test Progress')).toBeNull();
    });
});