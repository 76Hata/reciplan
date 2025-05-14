// src/components/Sidebar.tsx
import {
    Box, VStack, Text, Link, IconButton, Drawer, DrawerBody, DrawerOverlay,
    DrawerContent, DrawerCloseButton, useDisclosure, useBreakpointValue,
} from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
import { Link as RouterLink, useLocation } from 'react-router-dom';

export const Sidebar = () => {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const isMobile = useBreakpointValue({ base: true, md: false });

    const location = useLocation(); // 現在のURLパス取得

    // active判定関数
    const isActive = (path: string) => location.pathname === path;

  // 共通のメニュー項目
  const MenuItems = () => (
    <VStack align="start" spacing={4}>
      <Text fontSize="lg" fontWeight="bold">メニュー</Text>

      <Link
        as={RouterLink}
        to="/"
        onClick={onClose}
        fontWeight={isActive('/') ? 'bold' : 'normal'}
        color={isActive('/') ? 'blue.600' : 'teal.700'}
      >
        🏠 ホーム
      </Link>

      <Link
        as={RouterLink}
        to="/synonyms"
        onClick={onClose}
        fontWeight={isActive('/synonyms') ? 'bold' : 'normal'}
        color={isActive('/synonyms') ? 'blue.600' : 'teal.700'}
      >
        📖 類義語登録
      </Link>

      {/* <Link
        as={RouterLink}
        to="/summary"
        onClick={onClose}
        fontWeight={isActive('/summary') ? 'bold' : 'normal'}
        color={isActive('/summary') ? 'blue.600' : 'teal.700'}
      >
        📊 期間集計
      </Link> */}
    </VStack>
  );

  return (
    <>
      {isMobile && (
        <IconButton
          aria-label="メニューを開く"
          icon={<HamburgerIcon />}
          onClick={onOpen}
          position="fixed"
          top="1rem"
          left="1rem"
          zIndex="overlay"
          bg="white"
        />
      )}

      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerBody p={6}>
            <MenuItems />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {!isMobile && (
        <Box
          as="nav"
          w="200px"
          minH="100vh"
          bg="gray.100"
          p={4}
          display={{ base: 'none', md: 'block' }}
        >
          <MenuItems />
        </Box>
      )}
    </>
  );
};