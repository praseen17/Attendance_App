#!/usr/bin/env ts-node

/**
 * Comprehensive Frontend Test Runner
 * 
 * This runner executes all React Native test suites:
 * 1. Unit Tests (services, hooks, utilities)
 * 2. Component Tests (UI components)
 * 3. Integration Tests (service integration)
 * 4. End-to-End Tests (complete user flows)
 * 5. Performance Tests (large datasets, memory usage)
 * 6. Hook Tests (React hooks)
 * 7. Context Tests (React context providers)
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import path from 'path';

interface TestSuite {
    name: string;
    pattern: string;
    timeout: number;
    description: string;
    category: 'unit' | 'component' | 'integration' | 'e2e' | 'performance' | 'hook' | 'context';
    priority: number;
    setupFiles?: string[];
}

const testSuites: TestSuite[] = [
    // Unit Tests - Highest Priority
    {
        name: 'Database Service Unit Tests',
        pattern: 'services/**/*database*.unit.test.{ts,tsx}',
        timeout: 30000,
        description: 'Database service unit tests',
        category: 'unit',
        priority: 1,
        setupFiles: ['<rootDir>/jest.setup.js']
    },
    {
        name: 'Auth Service Unit Tests',
        pattern: 'services/**/*auth*.unit.test.{ts,tsx}',
        timeout: 30000,
        description: 'Authentication service unit tests',
        category: 'unit',
        priority: 1,
        setupFiles: ['<rootDir>/jest.setup.js']
    },
    {
        name: 'Sync Service Unit Tests',
        pattern: 'services/**/*sync*.unit.test.{ts,tsx}',
        timeout: 30000,
        description: 'Sync service unit tests',
        category: 'unit',
        priority: 1,
        setupFiles: ['<rootDir>/jest.setup.js']
    },
    {
        name: 'Network Service Unit Tests',
        pattern: 'services/**/*network*.unit.test.{ts,tsx}',
        timeout: 30000,
        description: 'Network service unit tests',
        category: 'unit',
        priority: 1,
        setupFiles: ['<rootDir>/jest.setup.js']
    },
    {
        name: 'ML WebSocket Service Unit Tests',
        pattern: 'services/**/*ml*.unit.test.{ts,tsx}',
        timeout: 30000,
        description: 'ML WebSocket service unit tests',
        category: 'unit',
        priority: 1,
        setupFiles: ['<rootDir>/jest.setup.js']
    },

    // Hook Tests
    {
        name: 'Authentication Hook Tests',
        pattern: 'hooks/**/*auth*.test.{ts,tsx}',
        timeout: 30000,
        description: 'Authentication hook tests',
        category: 'hook',
        priority: 2,
        setupFiles: ['<rootDir>/jest.setup.js', '@testing-library/react-native/extend-expect']
    },
    {
        name: 'Database Hook Tests',
        pattern: 'hooks/**/*database*.test.{ts,tsx}',
        timeout: 30000,
        description: 'Database hook tests',
        category: 'hook',
        priority: 2,
        setupFiles: ['<rootDir>/jest.setup.js', '@testing-library/react-native/extend-expect']
    },
    {
        name: 'Sync Hook Tests',
        pattern: 'hooks/**/*sync*.test.{ts,tsx}',
        timeout: 30000,
        description: 'Sync hook tests',
        category: 'hook',
        priority: 2,
        setupFiles: ['<rootDir>/jest.setup.js', '@testing-library/react-native/extend-expect']
    },
    {
        name: 'Network Hook Tests',
        pattern: 'hooks/**/*network*.test.{ts,tsx}',
        timeout: 30000,
        description: 'Network status hook tests',
        category: 'hook',
        priority: 2,
        setupFiles: ['<rootDir>/jest.setup.js', '@testing-library/react-native/extend-expect']
    },

    // Context Tests
    {
        name: 'Authentication Context Tests',
        pattern: 'contexts/**/*auth*.test.{ts,tsx}',
        timeout: 30000,
        description: 'Authentication context tests',
        category: 'context',
        priority: 2,
        setupFiles: ['<rootDir>/jest.setup.js', '@testing-library/react-native/extend-expect']
    },
    {
        name: 'Database Context Tests',
        pattern: 'contexts/**/*database*.test.{ts,tsx}',
        timeout: 30000,
        description: 'Database context tests',
        category: 'context',
        priority: 2,
        setupFiles: ['<rootDir>/jest.setup.js', '@testing-library/react-native/extend-expect']
    },
    {
        name: 'Sync Context Tests',
        pattern: 'contexts/**/*sync*.test.{ts,tsx}',
        timeout: 30000,
        description: 'Sync context tests',
        category: 'context',
        priority: 2,
        setupFiles: ['<rootDir>/jest.setup.js', '@testing-library/react-native/extend-expect']
    },
    {
        name: 'Network Context Tests',
        pattern: 'contexts/**/*network*.test.{ts,tsx}',
        timeout: 30000,
        description: 'Network context tests',
        category: 'context',
        priority: 2,
        setupFiles: ['<rootDir>/jest.setup.js', '@testing-library/react-native/extend-expect']
    },

    // Component Tests
    {
        name: 'Status Indicator Component Tests',
        pattern: 'components/**/*status*.test.{ts,tsx}',
        timeout: 30000,
        description: 'Status indicator component tests',
        category: 'component',
        priority: 3,
        setupFiles: ['<rootDir>/jest.setup.js', '@testing-library/react-native/extend-expect']
    },
    {
        name: 'Authentication Component Tests',
        pattern: 'components/**/*auth*.test.{ts,tsx}',
        timeout: 30000,
        description: 'Authentication component tests',
        category: 'component',
        priority: 3,
        setupFiles: ['<rootDir>/jest.setup.js', '@testing-library/react-native/extend-expect']
    },
    {
        name: 'UI Component Tests',
        pattern: 'components/**/*.test.{ts,tsx}',
        timeout: 30000,
        description: 'General UI component tests',
        category: 'component',
        priority: 3,
        setupFiles: ['<rootDir>/jest.setup.js', '@testing-library/react-native/extend-expect']
    },

    // Integration Tests
    {
        name: 'Service Integration Tests',
        pattern: 'services/**/*.integration.test.{ts,tsx}',
        timeout: 60000,
        description: 'Service integration tests',
        category: 'integration',
        priority: 4,
        setupFiles: ['<rootDir>/jest.setup.js']
    },
    {
        name: 'Database Integration Tests',
        pattern: '__tests__/**/*database*.integration.test.{ts,tsx}',
        timeout: 60000,
        description: 'Database integration tests',
        category: 'integration',
        priority: 4,
        setupFiles: ['<rootDir>/jest.setup.js']
    },
    {
        name: 'Sync Integration Tests',
        pattern: '__tests__/**/*sync*.integration.test.{ts,tsx}',
        timeout: 90000,
        description: 'Sync integration tests',
        category: 'integration',
        priority: 4,
        setupFiles: ['<rootDir>/jest.setup.js']
    },

    // End-to-End Tests
    {
        name: 'Authentication Flow E2E Tests',
        pattern: '__tests__/**/*auth*.e2e.test.{ts,tsx}',
        timeout: 120000,
        description: 'Authentication flow E2E tests',
        category: 'e2e',
        priority: 5,
        setupFiles: ['<rootDir>/jest.setup.js']
    },
    {
        name: 'Attendance Capture E2E Tests',
        pattern: '__tests__/**/*attendance*.e2e.test.{ts,tsx}',
        timeout: 120000,
        description: 'Attendance capture E2E tests',
        category: 'e2e',
        priority: 5,
        setupFiles: ['<rootDir>/jest.setup.js']
    },
    {
        name: 'Comprehensive E2E Tests',
        pattern: '__tests__/**/*e2e*.test.{ts,tsx}',
        timeout: 180000,
        description: 'Comprehensive end-to-end tests',
        category: 'e2e',
        priority: 5,
        setupFiles: ['<rootDir>/jest.setup.js']
    },

    // Performance Tests - Lower Priority (Slower)
    {
        name: 'Database Performance Tests',
        pattern: '__tests__/**/*database*.performance.test.{ts,tsx}',
        timeout: 180000,
        description: 'Database performance tests',
        category: 'performance',
        priority: 6,
        setupFiles: ['<rootDir>/jest.setup.js']
    },
    {
        name: 'Sync Performance Tests',
        pattern: '__tests__/**/*sync*.performance.test.{ts,tsx}',
        timeout: 300000,
        description: 'Sync performance tests',
        category: 'performance',
        priority: 6,
        setupFiles: ['<rootDir>/jest.setup.js']
    },
    {
        name: 'Memory Usage Performance Tests',
        pattern: '__tests__/**/*memory*.performance.test.{ts,tsx}',
        timeout: 240000,
        description: 'Memory usage performance tests',
        category: 'performance',
        priority: 6,
        setupFiles: ['<rootDir>/jest.setup.js']
    }
];

interface TestResult {
    suite: string;
    category: string;
    passed: boolean;
    duration: number;
    coverage?: number;
    errors?: string[];
}

interface TestRunOptions {
    verbose: boolean;
    failFast: boolean;
    coverage: boolean;
    watchMode: boolean;
    categories: string[];
    outputFormat: 'console' | 'json' | 'html';
    reportFile?: string;
}

class FrontendComprehensiveTestRunner {
    private options: TestRunOptions;
    private results: TestResult[] = [];
    private startTime: number = 0;

    constructor(options: Partial<TestRunOptions> = {}) {
        this.options = {
            verbose: options.verbose || false,
            failFast: options.failFast || false,
            coverage: options.coverage || false,
            watchMode: options.watchMode || false,
            categories: options.categories || ['unit', 'hook', 'context', 'component', 'integration', 'e2e', 'performance'],
            outputFormat: options.outputFormat || 'console',
            reportFile: options.reportFile
        };
    }

    async runAllTests(): Promise<void> {
        this.startTime = Date.now();

        console.log('🚀 Starting Frontend Comprehensive Test Suite');
        console.log('==============================================');

        if (this.options.watchMode) {
            console.log('👀 Running in watch mode...');
            await this.runInWatchMode();
            return;
        }

        await this.checkTestEnvironment();

        // Filter test suites by selected categories
        const filteredSuites = testSuites
            .filter(suite => this.options.categories.includes(suite.category))
            .sort((a, b) => a.priority - b.priority);

        console.log(`\n📋 Running ${filteredSuites.length} test suites across ${this.options.categories.length} categories\n`);

        await this.runTestsSequentially(filteredSuites);
        await this.generateReport();
        this.printFinalSummary();
    }

    private async runTestsSequentially(suites: TestSuite[]): Promise<void> {
        for (const suite of suites) {
            const startTime = Date.now();

            try {
                console.log(`📋 Running ${suite.name}...`);
                console.log(`   Category: ${suite.category.toUpperCase()}`);
                console.log(`   ${suite.description}`);

                await this.runTestSuite(suite);

                const duration = Date.now() - startTime;
                this.results.push({
                    suite: suite.name,
                    category: suite.category,
                    passed: true,
                    duration
                });

                console.log(`✅ ${suite.name} passed (${duration}ms)\n`);

            } catch (error) {
                const duration = Date.now() - startTime;
                this.results.push({
                    suite: suite.name,
                    category: suite.category,
                    passed: false,
                    duration,
                    errors: [error instanceof Error ? error.message : String(error)]
                });

                console.error(`❌ ${suite.name} failed (${duration}ms)`);

                if (this.options.verbose) {
                    console.error(error);
                }

                if (this.options.failFast) {
                    console.error('\n💥 Stopping due to test failure (fail-fast mode)');
                    process.exit(1);
                }
                console.log('');
            }
        }
    }

    private async runTestSuite(suite: TestSuite): Promise<void> {
        const jestCommand = this.buildJestCommand(suite);

        if (this.options.verbose) {
            console.log(`   Command: ${jestCommand}`);
        }

        try {
            execSync(jestCommand, {
                stdio: this.options.verbose ? 'inherit' : 'pipe',
                timeout: suite.timeout,
                cwd: process.cwd(),
                env: {
                    ...process.env,
                    NODE_ENV: 'test'
                }
            });
        } catch (error: any) {
            if (error.status !== 0) {
                throw new Error(`Test suite failed with exit code ${error.status}`);
            }
            throw error;
        }
    }

    private buildJestCommand(suite: TestSuite): string {
        const baseCommand = 'npx jest';
        const options = [
            `--testPathPattern="${suite.pattern}"`,
            `--testTimeout=${suite.timeout}`,
            '--verbose',
            '--detectOpenHandles',
            '--forceExit'
        ];

        if (this.options.coverage) {
            options.push('--coverage');
            options.push('--coverageDirectory=coverage');
            options.push('--coverageReporters=text');
            options.push('--coverageReporters=lcov');
            options.push('--coverageReporters=html');
        }

        if (!this.options.verbose) {
            options.push('--silent');
        }

        if (suite.setupFiles) {
            suite.setupFiles.forEach(setupFile => {
                options.push(`--setupFilesAfterEnv=${setupFile}`);
            });
        }

        return `${baseCommand} ${options.join(' ')}`;
    }

    private async runInWatchMode(): Promise<void> {
        const jestCommand = 'npx jest --watch --verbose';

        try {
            execSync(jestCommand, {
                stdio: 'inherit',
                cwd: process.cwd(),
                env: {
                    ...process.env,
                    NODE_ENV: 'test'
                }
            });
        } catch (error) {
            console.error('Watch mode interrupted');
        }
    }

    private async checkTestEnvironment(): Promise<void> {
        console.log('🔍 Checking frontend test environment...');

        // Check Node.js version
        const nodeVersion = process.version;
        console.log(`   Node.js: ${nodeVersion}`);

        // Check if required mock files exist
        const mockFiles = [
            path.join(process.cwd(), '__mocks__', 'expo-sqlite.ts'),
            path.join(process.cwd(), 'jest.setup.js'),
            path.join(process.cwd(), 'jest.config.js')
        ];

        for (const mockFile of mockFiles) {
            if (!existsSync(mockFile)) {
                console.warn(`⚠️  Mock file not found: ${path.basename(mockFile)}`);
            } else {
                console.log(`   ✓ ${path.basename(mockFile)}`);
            }
        }

        // Set test environment
        if (!process.env.NODE_ENV) {
            process.env.NODE_ENV = 'test';
        }

        // Check available memory
        const memoryUsage = process.memoryUsage();
        console.log(`   Memory: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB used / ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB total`);

        console.log(`   Environment: ${process.env.NODE_ENV}`);
        console.log(`   Platform: React Native`);
        console.log('✅ Frontend environment check complete\n');
    }

    private async generateReport(): Promise<void> {
        if (this.options.outputFormat === 'json' || this.options.reportFile) {
            const report = {
                summary: this.generateSummary(),
                results: this.results,
                environment: {
                    nodeVersion: process.version,
                    platform: 'React Native',
                    timestamp: new Date().toISOString()
                }
            };

            const reportJson = JSON.stringify(report, null, 2);

            if (this.options.reportFile) {
                writeFileSync(this.options.reportFile, reportJson);
                console.log(`📄 Frontend test report saved to: ${this.options.reportFile}`);
            }

            if (this.options.outputFormat === 'json') {
                console.log(reportJson);
            }
        }

        if (this.options.coverage) {
            console.log('\n📈 Frontend coverage report generated in ./coverage/');
            console.log('   HTML report: ./coverage/lcov-report/index.html');
        }
    }

    private generateSummary() {
        const totalDuration = Date.now() - this.startTime;
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;

        const categoryStats = this.options.categories.map(category => {
            const categoryResults = this.results.filter(r => r.category === category);
            return {
                category,
                total: categoryResults.length,
                passed: categoryResults.filter(r => r.passed).length,
                failed: categoryResults.filter(r => !r.passed).length,
                duration: categoryResults.reduce((sum, r) => sum + r.duration, 0)
            };
        });

        return {
            total: this.results.length,
            passed,
            failed,
            duration: totalDuration,
            categories: categoryStats
        };
    }

    private printFinalSummary(): void {
        const summary = this.generateSummary();

        console.log('\n📊 Frontend Test Summary');
        console.log('=========================');

        // Overall stats
        console.log(`Total Suites: ${summary.total}`);
        console.log(`Passed: ${summary.passed}`);
        console.log(`Failed: ${summary.failed}`);
        console.log(`Duration: ${summary.duration}ms (${(summary.duration / 1000 / 60).toFixed(2)} minutes)`);

        // Category breakdown
        console.log('\nCategory Breakdown:');
        summary.categories.forEach(cat => {
            const status = cat.failed === 0 ? '✅' : '❌';
            const duration = `${(cat.duration / 1000).toFixed(2)}s`;
            console.log(`${status} ${cat.category.toUpperCase().padEnd(12)} ${cat.passed}/${cat.total} passed (${duration})`);
        });

        // Failed tests details
        const failedTests = this.results.filter(r => !r.passed);
        if (failedTests.length > 0) {
            console.log('\nFailed Tests:');
            failedTests.forEach(test => {
                console.log(`❌ ${test.suite} (${test.category})`);
                if (test.errors) {
                    test.errors.forEach(error => {
                        console.log(`   Error: ${error}`);
                    });
                }
            });
        }

        console.log('=========================');

        if (this.options.coverage) {
            console.log('\n📈 Coverage report generated in ./coverage/');
        }

        if (summary.failed > 0) {
            console.log('\n❌ Some frontend tests failed!');
            process.exit(1);
        } else {
            console.log('\n🎉 All frontend tests passed!');
        }
    }

    async runSpecificCategory(category: string): Promise<void> {
        const validCategories = ['unit', 'hook', 'context', 'component', 'integration', 'e2e', 'performance'];

        if (!validCategories.includes(category)) {
            console.error(`❌ Category "${category}" not found`);
            console.log('Available categories:');
            validCategories.forEach(cat => {
                console.log(`  - ${cat}`);
            });
            process.exit(1);
        }

        this.options.categories = [category];
        await this.runAllTests();
    }

    async generateCoverageReport(): Promise<void> {
        console.log('📈 Generating comprehensive frontend coverage report...');

        const coverageCommand = [
            'npx jest',
            '--coverage',
            '--coverageDirectory=coverage',
            '--coverageReporters=text',
            '--coverageReporters=lcov',
            '--coverageReporters=html',
            '--collectCoverageFrom="services/**/*.{ts,tsx}"',
            '--collectCoverageFrom="hooks/**/*.{ts,tsx}"',
            '--collectCoverageFrom="contexts/**/*.{ts,tsx}"',
            '--collectCoverageFrom="components/**/*.{ts,tsx}"',
            '--collectCoverageFrom="!**/*.d.ts"',
            '--collectCoverageFrom="!**/node_modules/**"',
            '--collectCoverageFrom="!**/__tests__/**"',
            '--collectCoverageFrom="!**/__mocks__/**"'
        ].join(' ');

        try {
            execSync(coverageCommand, {
                stdio: 'inherit',
                cwd: process.cwd(),
                env: {
                    ...process.env,
                    NODE_ENV: 'test'
                }
            });

            console.log('✅ Frontend coverage report generated successfully');
            console.log('   HTML report: ./coverage/lcov-report/index.html');

        } catch (error) {
            console.error('❌ Failed to generate frontend coverage report');
            throw error;
        }
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const options: Partial<TestRunOptions> = {
        verbose: args.includes('--verbose') || args.includes('-v'),
        failFast: args.includes('--fail-fast') || args.includes('-f'),
        coverage: args.includes('--coverage') || args.includes('-c'),
        watchMode: args.includes('--watch') || args.includes('-w'),
        outputFormat: args.includes('--json') ? 'json' : 'console'
    };

    // Check for report file option
    const reportIndex = args.findIndex(arg => arg.startsWith('--report='));
    if (reportIndex !== -1) {
        options.reportFile = args[reportIndex].split('=')[1];
    }

    // Check for specific categories
    const categoryIndex = args.findIndex(arg => arg.startsWith('--categories='));
    if (categoryIndex !== -1) {
        options.categories = args[categoryIndex].split('=')[1].split(',');
    }

    const runner = new FrontendComprehensiveTestRunner(options);

    // Check for specific commands
    const categoryArg = args.find(arg =>
        !arg.startsWith('--') &&
        !arg.startsWith('-') &&
        ['unit', 'hook', 'context', 'component', 'integration', 'e2e', 'performance'].includes(arg)
    );
    const coverageOnly = args.includes('--coverage-only');

    try {
        if (coverageOnly) {
            await runner.generateCoverageReport();
        } else if (categoryArg) {
            await runner.runSpecificCategory(categoryArg);
        } else {
            await runner.runAllTests();
        }
    } catch (error) {
        console.error('💥 Frontend test runner failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

export { FrontendComprehensiveTestRunner };