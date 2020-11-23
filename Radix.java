import java.math.BigInteger;
import java.util.regex.Pattern;

public class Radix {

    public static String encode(BigInteger num, final BigInteger base, final String cs) {
        if (cs.length() != base.intValue()) {
            throw new IllegalArgumentException("Digest chars length != base");
        }
        StringBuilder ret = new StringBuilder();
        do {
            BigInteger[] bis = num.divideAndRemainder(base);
            ret.append(cs.charAt(bis[1].intValue()));
            num = bis[0];
        } while (!num.equals(BigInteger.ZERO));
        return ret.reverse().toString();
    }

    public static BigInteger decode(String num, final BigInteger base, final String cs) {
        if (cs.length() != base.intValue()) {
            throw new IllegalArgumentException("Digest chars length != base");
        }
        BigInteger ret = BigInteger.ZERO;
        for (int i = 0, e = num.length() - 1; i <= e; i++) {
            int v = cs.indexOf(num.charAt(i));//check index = -1 ?
            ret = ret.add(base.pow(e - i).multiply(BigInteger.valueOf(v)));
        }
        return ret;
    }

    public static class R62 {
        private static final BigInteger BASE = BigInteger.valueOf(62);
        private static final String CS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        private static final Pattern REGEX = Pattern.compile("^[0-9a-zA-Z]+$");

        public static String encode(BigInteger num) {
            return Radix.encode(num, BASE, CS);
        }

        public static boolean is(String num) {
            return REGEX.matcher(num).matches();
        }

        public static BigInteger decode(String num) {
            if (!is(num)) {
                return null;
            }
            return Radix.decode(num, BASE, CS);
        }
    }

}
