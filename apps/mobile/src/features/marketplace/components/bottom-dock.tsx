import { useRouter } from 'expo-router';

import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { textStyle } from '@/theme/typography';

export type DockTab = 'offers' | 'search' | 'agreements' | 'publish';

interface DockItem {
  id: DockTab;
  label: string;
  href: '/home' | '/search' | '/chat/td-892' | '/publish';
  testID: string;
}

const DOCK_ITEMS: readonly DockItem[] = [
  { id: 'offers', label: 'Ofertas', href: '/home', testID: 'dock-offers' },
  { id: 'search', label: 'Buscar', href: '/search', testID: 'dock-search' },
  {
    id: 'agreements',
    label: 'Acuerdos',
    href: '/chat/td-892',
    testID: 'dock-agreements',
  },
  { id: 'publish', label: 'Publicar', href: '/publish', testID: 'dock-publish' },
] as const;

export interface BottomDockProps {
  activeTab: DockTab;
}

export function BottomDock({ activeTab }: BottomDockProps) {
  const router = useRouter();

  return (
    <Box
      className="w-full flex-row items-center justify-around border-t border-outline-variant bg-surface px-3 py-3 shadow-md"
      testID="stitch-bottom-dock"
    >
      {DOCK_ITEMS.map((item) => {
        const isActive = item.id === activeTab;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            className={
              isActive
                ? 'min-w-[72px] items-center rounded-xl bg-primary px-3 py-2 shadow-xs'
                : 'min-w-[72px] items-center rounded-xl bg-surface-muted px-3 py-2 active:bg-accent'
            }
            key={item.id}
            onPress={() => router.push(item.href)}
            testID={item.testID}
          >
            <Text
              className={
                isActive
                  ? 'text-primary-foreground font-semibold'
                  : 'text-muted-foreground'
              }
              style={textStyle('label-md')}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </Box>
  );
}
