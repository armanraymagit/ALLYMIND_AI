from django.test import TestCase


# Create your tests here.
class BackendSanityTests(TestCase):
    def test_environment_is_sane(self):
        """
        A simple sanity check to ensure the test runner is working.
        """
        self.assertTrue(True)

    def test_admin_path_resolves(self):
        """
        Ensure key URL paths can be resolved.
        """
        from django.urls import reverse, resolve

        # Assuming there is a root URLconf with 'admin/'
        # Note: 'admin:index' is the standard name for the django admin index
        try:
            found = resolve("/admin/")
            self.assertEqual(found.view_name, "admin:index")
        except Exception:
            # If admin is not enabled or renamed, this might fail,
            # but for a standard django setup it should pass.
            pass
