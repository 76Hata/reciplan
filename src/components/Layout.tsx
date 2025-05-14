// src/components/Layout.tsx
import { Flex, Box } from '@chakra-ui/react';
import { Sidebar } from './Sidebar';
import { ReactNode } from 'react';

export const Layout = ({ children }: { children: ReactNode }) => (
    <Flex>
        <Sidebar />

        <Box flex="1" ml={{ base: 0, md: '200px' }} p={4} minH="100vh" overflowX="auto">
            {children}
        </Box>
    </Flex>
);
